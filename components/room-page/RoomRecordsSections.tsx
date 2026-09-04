import { DocumentCard } from "@/components/DocumentCard";
import { ReminderCard } from "@/components/ReminderCard";
import {
  mailboxRouteLabel,
  mailboxRouteTone,
  roomDocumentSectionTitle,
  type RoomDocumentEntry,
} from "@/components/room-page/room-page-model";
import { SectionHeader } from "@/components/SectionHeader";
import type { MailItem } from "@/lib/diarydock-data";
import type { Reminder } from "@/lib/mock-data";

type RoomRecordsSectionsProps = {
  documents: RoomDocumentEntry[];
  mailItems: MailItem[];
  onAddDocument: () => void;
  onRouteMail: (id: string, target: "vault" | "reminder" | "room") => void;
  reminders: Reminder[];
  roomId: string;
};

export function RoomRecordsSections({
  documents,
  mailItems,
  onAddDocument,
  onRouteMail,
  reminders,
  roomId,
}: RoomRecordsSectionsProps) {
  return (
    <>
      <section id="room-documents" className="scroll-mt-24 space-y-3">
        <div className="flex items-end justify-between gap-3">
          <SectionHeader
            title={roomDocumentSectionTitle(roomId)}
            hint="Stored securely in All Files and linked to this room"
            actionLabel="Open All Files"
            actionHref="/files"
          />
          <button
            type="button"
            onClick={onAddDocument}
            className="rounded-full border border-white/70 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-ink/70 shadow-soft transition hover:bg-white"
          >
            Add document
          </button>
        </div>
        <div className="estate-sheet divide-y divide-white/60 overflow-hidden">
          {documents.map((document) => (
            <DocumentCard
              key={document.id}
              title={document.title}
              kind={document.kind}
              meta={`${document.size} - Updated ${document.updated.toLowerCase()}`}
              href={document.href}
              badge={
                document.reviewStatus === "needs-review"
                  ? "Please check"
                  : undefined
              }
            />
          ))}
        </div>
      </section>
      {roomId === "mailbox" ? (
        <section className="space-y-3">
          <SectionHeader
            title="Mailbox intake queue"
            hint="Route new arrivals into the estate"
          />
          <div className="space-y-3">
            {mailItems.map((item) => (
              <article key={item.id} className="estate-sheet p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-ink/50">
                      {item.source} - {item.kind}
                      {item.suggestedRoom
                        ? ` - Suggested room: ${item.suggestedRoom}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${mailboxRouteTone[item.routeStatus]}`}
                  >
                    {mailboxRouteLabel[item.routeStatus]}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onRouteMail(item.id, "vault")}
                    className="rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-ink/65 transition hover:bg-white"
                  >
                    File to All Files
                  </button>
                  <button
                    type="button"
                    onClick={() => onRouteMail(item.id, "reminder")}
                    className="rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-ink/65 transition hover:bg-white"
                  >
                    Create reminder
                  </button>
                  <button
                    type="button"
                    onClick={() => onRouteMail(item.id, "room")}
                    className="rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-ink/65 transition hover:bg-white"
                  >
                    Send to room
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {reminders.length ? (
        <section className="space-y-3">
          <SectionHeader
            title="Linked reminders"
            hint="Jobs connected to this room"
            actionLabel="Open reminders"
            actionHref="/reminders"
          />
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                href="/reminders"
                showRoom={false}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
