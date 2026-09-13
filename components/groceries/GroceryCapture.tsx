"use client";
import { useEffect, useRef, useState } from "react";
import { GroceryCamera } from "./GroceryCamera";

export function GroceryCapture({ frames, kind, locked, busy, onFiles, onRead, onClear, onManual }: {
  frames: File[]; kind: string; locked: boolean; busy: boolean;
  onFiles: (files: File[]) => void; onRead: () => void; onClear: () => void; onManual: () => void;
}) {
  const library = useRef<HTMLInputElement>(null);
  const [cameraMode, setCameraMode] = useState<"photo" | "video" | null>(null);
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!frames[0]) { setPreview(""); return; }
    const url = URL.createObjectURL(frames[0]); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [frames]);
  if (cameraMode) return <GroceryCamera mode={cameraMode} onClose={() => setCameraMode(null)}
    onCapture={file => { setCameraMode(null); onFiles([file]); }} />;
  return <section className="grocery-capture">
    <h2>{frames.length ? kind + " added" : "Add your shopping"}</h2>
    {frames.length ? <>
      <div className="grocery-capture-ready">
        {/* Local captured frame; never a remote image. */}
        {preview ? <img src={preview} alt="Your grocery capture" /> : null}
        <div><strong>✓ Ready to read</strong><p>Your {kind.toLowerCase()} is ready. Tap below to find the products and dates.</p></div>
      </div>
      <button className="grocery-primary grocery-wide" disabled={locked} onClick={onRead}>Upload &amp; read labels</button>
      <p className="grocery-small">This sends label images to OpenAI. Temporary captures are cleared after reading; no gallery copy is created. You check the dates before saving.</p>
      <button disabled={locked} onClick={onClear}>Choose again</button>
    </> : <>
      <p>Show the product name and date clearly. Pause on each label when filming (up to 45 seconds).</p>
      <div className="grocery-capture-buttons">
        <button disabled={locked} onClick={() => setCameraMode("photo")}>Take photo</button>
        <button disabled={locked} onClick={() => setCameraMode("video")}>Record video</button>
      </div>
      <div className="grocery-actions">
        <button disabled={locked} onClick={() => library.current?.click()}>Choose photo or video</button>
        <button disabled={locked} onClick={onManual}>Add manually</button>
      </div>
    </>}
    <input hidden ref={library} type="file" accept="image/*,video/*" multiple
      onChange={event => { onFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    {busy ? <span className="grocery-small">Please keep this page open.</span> : null}
  </section>;
}
