import { useCallback, useEffect, useRef, useState } from "react";

const MAX_RECORDING_MS = 60_000;

function preferredMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["audio/mp4", "audio/webm", "audio/mpeg"].find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function useVoiceCapture(onCapture: (file: File) => void) {
  const [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  const cleanup = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    recorder.current = null;
    setRecording(false);
  }, []);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    stream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      throw new Error("Voice capture is not supported on this device.");
    }
    const media = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    const mimeType = preferredMimeType();
    const next = new MediaRecorder(media, mimeType ? { mimeType } : undefined);
    stream.current = media;
    recorder.current = next;
    chunks.current = [];
    next.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
    next.onerror = cleanup;
    next.onstop = () => {
      const type = next.mimeType || mimeType || "audio/webm";
      const extension = type.includes("mp4") ? "m4a" : type.includes("mpeg") ? "mp3" : "webm";
      const file = new File(chunks.current, `notice-voice.${extension}`, { type });
      cleanup();
      if (file.size) onCapture(file);
    };
    next.start(1_000);
    setRecording(true);
    timer.current = window.setTimeout(stop, MAX_RECORDING_MS);
  }, [cleanup, onCapture, stop]);

  return { recording, start, stop };
}
