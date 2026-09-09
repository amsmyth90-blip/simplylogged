import { useMemo } from "react";

import { PreviewStore } from "./MobilePreview";
import { SearchScreen } from "@mobile/search/SearchScreen";

function Preview({ initialMode }: { initialMode: "ASK" | "SEARCH" }) {
  const store = useMemo(() => new PreviewStore(), []);
  return (
    <SearchScreen
      accessToken="preview-access-token-is-never-sent"
      disableOnline
      initialMode={initialMode}
      store={store}
      syncStatus="READY"
      onBack={() => undefined}
      onNavigate={() => undefined}
      onOpenArea={() => undefined}
    />
  );
}

export function SearchPreview() {
  return <Preview initialMode="SEARCH" />;
}

export function AskPreview() {
  return <Preview initialMode="ASK" />;
}
