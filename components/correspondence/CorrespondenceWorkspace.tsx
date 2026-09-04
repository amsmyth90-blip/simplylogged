"use client";

import { CorrespondenceDashboard } from "./workspace/CorrespondenceDashboard";
import { CorrespondenceDetail } from "./workspace/CorrespondenceDetail";
import { CorrespondenceFolders } from "./workspace/CorrespondenceFolders";
import { CorrespondenceSummary } from "./workspace/CorrespondenceSummary";
import type { CorrespondenceView } from "./workspace/correspondence-shared";
import { NewCorrespondence } from "./workspace/NewCorrespondence";

export function CorrespondenceWorkspace({
  view,
  correspondenceId,
}: {
  view: CorrespondenceView;
  correspondenceId?: string;
}) {
  if (view === "folders") return <CorrespondenceFolders />;
  if (view === "new") return <NewCorrespondence />;
  if (view === "detail" && correspondenceId)
    return <CorrespondenceDetail correspondenceId={correspondenceId} />;
  if (view === "summary" && correspondenceId)
    return <CorrespondenceSummary correspondenceId={correspondenceId} />;
  return <CorrespondenceDashboard />;
}
