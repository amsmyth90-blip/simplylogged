import { capturedDocumentFromBytes, type CapturedDocument } from "@mobile/capture/capture-source";
import { groceryVideoFrameTimes } from "@diarydock/kitchen";

export const MAX_GROCERY_VIDEO_BYTES = 80 * 1024 * 1024;
export const MAX_GROCERY_VIDEO_SECONDS = 30;
export const MAX_GROCERY_VIDEO_FRAMES = 6;

function waitFor(target: HTMLMediaElement, eventName: "loadedmetadata" | "seeked", timeout = 15_000) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => finish(new Error("The video took too long to open.")), timeout);
    const onEvent = () => finish();
    const onError = () => finish(new Error("The video could not be opened."));
    function finish(error?: Error) {
      window.clearTimeout(timer);
      target.removeEventListener(eventName, onEvent);
      target.removeEventListener("error", onError);
      if (error) reject(error); else resolve();
    }
    target.addEventListener(eventName, onEvent, { once: true });
    target.addEventListener("error", onError, { once: true });
  });
}

function canvasJpeg(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => {
    if (blob) resolve(blob); else reject(new Error("A clear image could not be made from the video."));
  }, "image/jpeg", 0.84));
}

export async function extractGroceryVideoFrames(
  file: File,
  maximumFrames = MAX_GROCERY_VIDEO_FRAMES,
): Promise<CapturedDocument[]> {
  if (!file.type.toLowerCase().startsWith("video/")) throw new Error("Please choose a video.");
  if (!file.size || file.size > MAX_GROCERY_VIDEO_BYTES) {
    throw new Error("Keep the grocery video under 80 MB.");
  }
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.src = objectUrl;
  try {
    await waitFor(video, "loadedmetadata");
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error("The video length could not be read.");
    }
    if (video.duration > MAX_GROCERY_VIDEO_SECONDS + 0.25) {
      throw new Error("Keep the grocery video to 30 seconds or less.");
    }
    if (!video.videoWidth || !video.videoHeight) throw new Error("The video picture could not be read.");

    const scale = Math.min(1, 1920 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Video scanning is not supported on this phone.");

    const frames: CapturedDocument[] = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    for (const [index, time] of groceryVideoFrameTimes(video.duration, maximumFrames).entries()) {
      video.currentTime = Math.min(time, Math.max(0, video.duration - 0.05));
      await waitFor(video, "seeked");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await canvasJpeg(canvas);
      const captured = capturedDocumentFromBytes(
        new Uint8Array(await blob.arrayBuffer()),
        `diarydock-grocery-video-${timestamp}-${index + 1}.jpg`,
        "image/jpeg",
      );
      if (captured.previewUrl) URL.revokeObjectURL(captured.previewUrl);
      frames.push({ ...captured, previewUrl: null });
    }
    return frames;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}
