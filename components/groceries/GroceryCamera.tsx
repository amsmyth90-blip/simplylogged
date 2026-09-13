"use client";
import { useEffect, useRef, useState } from "react";

// Capture stays in memory. No gallery, filesystem, download or media-library writes.
export function GroceryCamera({ mode, onCapture, onClose }: {
  mode: "photo" | "video"; onCapture: (file: File) => void; onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(true);
  const [ready, setReady] = useState(false), [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0), [error, setError] = useState("");
  const [capturing, setCapturing] = useState(false);
  const callback = useRef({ onCapture, onClose });
  useEffect(() => { callback.current = { onCapture, onClose }; }, [onCapture, onClose]);

  function release() {
    if (timer.current) clearInterval(timer.current);
    if (limit.current) clearTimeout(limit.current);
    if (recorder.current) {
      recorder.current.onstop = null; recorder.current.ondataavailable = null;
      if (recorder.current.state !== "inactive") recorder.current.stop();
    }
    recorder.current = null;
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null; chunks.current = [];
  }
  useEffect(() => {
    let cancelled = false; active.current = true;
    if (!navigator.mediaDevices?.getUserMedia) setError("Camera unavailable. Choose an existing file or add products manually.");
    else void navigator.mediaDevices.getUserMedia({
      audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    }).then(async media => {
      if (cancelled) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      if (video.current) { video.current.srcObject = media; await video.current.play(); }
    }).catch(() => { if (!cancelled) { release(); setError("Camera could not open. Check camera permission, or choose an existing file."); } });
    const hide = () => { if (document.visibilityState === "hidden") { release(); callback.current.onClose(); } };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { release(); callback.current.onClose(); } };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("keydown", escape);
    return () => {
      cancelled = true; active.current = false; release();
      document.removeEventListener("visibilitychange", hide); window.removeEventListener("keydown", escape);
    };
  }, []);
  function deliver(file: File) {
    if (!active.current) return;
    release(); callback.current.onCapture(file);
  }
  async function takePhoto() {
    if (!video.current?.videoWidth || capturing) return;
    setCapturing(true);
    const canvas = document.createElement("canvas");
    canvas.width = video.current.videoWidth; canvas.height = video.current.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) { setError("Photo capture unavailable."); setCapturing(false); return; }
    context.drawImage(video.current, 0, 0);
    canvas.toBlob(blob => {
      if (blob) deliver(new File([blob], "grocery-photo.jpg", { type: "image/jpeg" }));
      else { setError("Photo could not be captured. Please retry."); setCapturing(false); }
      canvas.width = 0; canvas.height = 0;
    }, "image/jpeg", .85);
  }
  function startVideo() {
    if (!stream.current || typeof MediaRecorder === "undefined") { setError("Video is unavailable on this device. Try a photo."); return; }
    try {
      const mimeType = ["video/webm;codecs=vp8", "video/webm", "video/mp4"].find(type => MediaRecorder.isTypeSupported(type));
      const next = new MediaRecorder(stream.current, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 2_000_000 });
      recorder.current = next; chunks.current = [];
      let size = 0, rejected = false;
      next.ondataavailable = event => {
        size += event.data.size;
        if (size > 80_000_000) { rejected = true; release(); setRecording(false); setError("Video too large. Try a shorter clip."); }
        else if (event.data.size) chunks.current.push(event.data);
      };
      next.onerror = () => { rejected = true; release(); setRecording(false); setError("Recording failed. Please close and try again."); };
      next.onstop = () => {
        if (rejected || !active.current) return;
        const type = next.mimeType || mimeType || "video/webm";
        const file = new File(chunks.current, "grocery-video." + (type.includes("mp4") ? "mp4" : "webm"), { type });
        if (file.size) deliver(file);
        else { release(); setRecording(false); setError("No video recorded. Please try again."); }
      };
      next.start(1000); setRecording(true);
      const started = Date.now();
      timer.current = setInterval(() => setSeconds(Math.min(45, Math.floor((Date.now() - started) / 1000))), 250);
      // A small margin keeps the container duration inside the server's 45-second limit.
      limit.current = setTimeout(() => { if (next.state === "recording") next.stop(); }, 44_000);
    } catch { release(); setError("Video capture is unavailable. Close this view and try a photo."); }
  }
  return <section className="grocery-camera" aria-label="Grocery camera">
    <header><h2>{mode === "photo" ? "Photograph the label" : "Film your groceries"}</h2>
      <button onClick={() => { release(); onClose(); }}>Cancel</button></header>
    <video ref={video} autoPlay muted playsInline onLoadedData={() => setReady(true)} aria-label="Live camera preview" />
    {error ? <p role="alert">{error}</p> : <p role="status">{recording ? "Recording · " + seconds + "s / 45s" : ready ? "Keep the name and date in view." : "Opening camera…"}</p>}
    <p className="grocery-small">Temporary capture only. Nothing is saved to your gallery. No sound is recorded.</p>
    {mode === "photo" ? <button className="grocery-primary grocery-wide" disabled={!ready || Boolean(error) || capturing} onClick={() => void takePhoto()}>Capture photo</button>
      : <button className="grocery-primary grocery-wide" disabled={!ready || Boolean(error) || capturing} onClick={() => {
        if (recording) { setCapturing(true); recorder.current?.stop(); } else startVideo();
      }}>{capturing ? "Finishing…" : recording ? "Stop & use video" : "Start recording"}</button>}
  </section>;
}
