"use client";

import { BottomNav } from "@/components/BottomNav";
import { NoticeArchiveSheet } from "@/components/kitchen-noticeboard/NoticeArchiveSheet";
import { NoticeboardSurface } from "@/components/kitchen-noticeboard/NoticeboardSurface";
import { NoticeEditorSheet } from "@/components/kitchen-noticeboard/NoticeEditorSheet";
import { useNoticeboardController } from "@/components/kitchen-noticeboard/use-noticeboard-controller";

export function KitchenNoticeboard() {
  const controller = useNoticeboardController();
  return (
    <div className="fixed inset-0 overflow-hidden bg-[linear-gradient(145deg,#eef4eb_0%,#fbfcf8_48%,#e7efe4_100%)] text-slate-900">
      <NoticeboardSurface
        archivedCount={controller.archivedNotices.length}
        filter={controller.filter}
        hydrated={controller.hydrated}
        notices={controller.visibleNotes}
        onAdd={controller.openCreate}
        onArchive={() => controller.setArchiveOpen(true)}
        onEdit={controller.openEdit}
        onFilter={controller.setFilter}
      />
      {controller.sheetOpen ? (
        <NoticeEditorSheet
          assignees={controller.assigneeOptions}
          captureError={controller.captureError}
          draft={controller.draft}
          editing={Boolean(controller.editingId)}
          linkCalendar={controller.linkCalendar}
          linkReminder={controller.linkReminder}
          processing={controller.processing}
          recording={controller.recording}
          whenOptions={controller.whenOptions}
          onArchive={controller.archiveNotice}
          onCapture={controller.analyseCapture}
          onClose={() => controller.setSheetOpen(false)}
          onSave={controller.saveNotice}
          onSetDraft={controller.setDraft}
          onSetLinkCalendar={controller.setLinkCalendar}
          onSetLinkReminder={controller.setLinkReminder}
          onStartVoice={controller.startVoiceCapture}
          onStopVoice={controller.stopVoiceCapture}
        />
      ) : null}
      {controller.archiveOpen ? (
        <NoticeArchiveSheet
          completed={controller.completedThisWeek}
          notices={controller.archivedNotices}
          onClose={() => controller.setArchiveOpen(false)}
          onRestore={controller.restoreNotice}
        />
      ) : null}
      {!controller.sheetOpen && !controller.archiveOpen ? <BottomNav /> : null}
    </div>
  );
}
