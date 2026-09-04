import { App, type RestoredListenerEvent } from "@capacitor/app";
import { useEffect } from "react";

import { capturedDocumentFromMedia, type CapturedDocument } from "./capture-source";

function restoredMedia(event: RestoredListenerEvent) {
  if (event.pluginId !== "Camera" || event.methodName !== "takePhoto" || !event.success) return null;
  if (!event.data || typeof event.data !== "object") return null;
  return event.data;
}

export function useRestoredCapture(onCapture: (capture: CapturedDocument) => void) {
  useEffect(() => {
    let active = true;
    const listener = App.addListener("appRestoredResult", (event) => {
      const media = restoredMedia(event);
      if (!media) return;
      void capturedDocumentFromMedia(media).then((capture) => {
        if (active) onCapture(capture);
      }).catch(() => undefined);
    });
    return () => {
      active = false;
      void listener.then((handle) => handle.remove());
    };
  }, [onCapture]);
}
