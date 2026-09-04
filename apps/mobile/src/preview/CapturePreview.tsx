import { useMemo } from "react";

import { CaptureScreen } from "@mobile/capture/CaptureScreen";

import { PreviewStore } from "./MobilePreview";

export function CapturePreview() {
  const store = useMemo(() => new PreviewStore(), []);
  return (
    <CaptureScreen
      accessToken="preview-access-token-that-is-long-enough"
      store={store}
      syncStatus="READY"
      synchronize={async () => true}
      onNavigate={() => undefined}
    />
  );
}
