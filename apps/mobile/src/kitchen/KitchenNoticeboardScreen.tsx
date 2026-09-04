import { useMemo, useState } from "react";

import {
  type KitchenNotice,
  type KitchenNoticeDraft,
  type KitchenNoticeboardSnapshot,
  type NoticeCategory,
} from "@diarydock/kitchen";
import type { OfflineStore } from "@diarydock/offline-store";

import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { NoticeArchive } from "./NoticeArchive";
import { NoticeEditor } from "./NoticeEditor";
import { NoticeboardSurface } from "./NoticeboardSurface";
import { useKitchenNoticeboard } from "./use-kitchen-noticeboard";

type NoticeFilter = "All" | NoticeCategory;

export function KitchenNoticeboardScreen(props: {
  accessToken: string;
  disableOnline?: boolean;
  initialSnapshot?: KitchenNoticeboardSnapshot;
  store: OfflineStore;
  syncStatus: string;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
}) {
  const board = useKitchenNoticeboard(props);
  const [filter, setFilter] = useState<NoticeFilter>("All");
  const [editing, setEditing] = useState<KitchenNotice | "NEW" | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const notices = useMemo(() => board.snapshot?.notices ?? [], [board.snapshot?.notices]);
  const visible = useMemo(() => notices
    .filter((notice) => !notice.archived && (filter === "All" || notice.category === filter))
    .sort((left, right) => Number(right.pinned) - Number(left.pinned)), [filter, notices]);
  const archived = notices.filter((notice) => notice.archived);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const completed = notices.filter((notice) => notice.completedAt
    && new Date(notice.completedAt).getTime() >= weekAgo);

  async function save(input: {
    draft: KitchenNoticeDraft;
    linkCalendar: boolean;
    linkReminder: boolean;
    noticeId: string | null;
  }) {
    return board.mutate({
      operation: "SAVE_NOTICE",
      noticeId: input.noticeId,
      title: input.draft.title,
      detail: input.draft.detail,
      category: input.draft.category,
      assignedTo: input.draft.assignedTo,
      due: input.draft.due,
      colour: input.draft.colour,
      pinned: input.draft.pinned,
      completed: input.draft.completed,
      source: input.draft.source ?? "manual",
      linkReminder: input.linkReminder,
      linkCalendar: input.linkCalendar,
    });
  }

  async function setState(notice: KitchenNotice, state: "ARCHIVED" | "RESTORED") {
    if (await board.mutate({ operation: "SET_NOTICE_STATE", noticeId: notice.id, state })) {
      if (state === "ARCHIVED") setEditing(null);
    }
  }

  return (
    <main className="noticeboard-screen">
      <div className="noticeboard-shell">
        <NoticeboardSurface archivedCount={archived.length} filter={filter} loading={board.loading}
          notices={visible} online={board.online} source={board.source}
          onAdd={() => setEditing("NEW")} onArchive={() => setArchiveOpen(true)}
          onBack={props.onBack} onEdit={setEditing} onFilter={setFilter} />
        {board.message ? <p className="noticeboard-message" role="status">{board.message}</p> : null}
      </div>
      {editing ? <NoticeEditor accessToken={props.accessToken}
        assignees={board.snapshot?.assignees ?? ["Family"]} busy={board.busy}
        online={board.online}
        notice={editing === "NEW" ? undefined : editing}
        onArchive={(notice) => void setState(notice, "ARCHIVED")}
        onClose={() => setEditing(null)} onSave={save} /> : null}
      {archiveOpen ? <NoticeArchive busy={board.busy} completed={completed} notices={archived}
        online={board.online} onClose={() => setArchiveOpen(false)}
        onRestore={(notice) => void setState(notice, "RESTORED")} /> : null}
      {!editing && !archiveOpen ? <MobileBottomNav active="HOME" onNavigate={props.onNavigate} /> : null}
    </main>
  );
}
