import { useMemo } from "react";

import { PreviewStore } from "./MobilePreview";
import { SearchScreen } from "@mobile/search/SearchScreen";

export function SearchPreview() {
  const store = useMemo(() => new PreviewStore(), []);
  return (
    <SearchScreen
      accessToken="preview-access-token-is-never-sent"
      disableOnline
      store={store}
      syncStatus="READY"
      onBack={() => undefined}
      onNavigate={() => undefined}
      onOpenArea={() => undefined}
    />
  );
}
