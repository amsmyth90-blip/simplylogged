import type { MailboxAction, MailboxItem } from "@diarydock/mailbox";

const actions: Array<{ action: MailboxAction; label: string; needsFile?: boolean }> = [
  { action: "SAVE_TO_FILES", label: "Save to All Files", needsFile: true },
  { action: "MAKE_REMINDER", label: "Make reminder" },
  { action: "SEND_TO_ROOM", label: "Send to room", needsFile: true },
  { action: "IGNORE", label: "Ignore" },
];

const status = { new: "Needs filing", vault: "Saved to All Files", reminder: "Reminder made",
  room: "Sent to room", ignored: "Ignored" } as const;

export function MailboxItemCard({ busy, item, onOpen, onRoute, online }: {
  busy: boolean; item: MailboxItem; online: boolean;
  onOpen: () => void; onRoute: (action: MailboxAction) => void;
}) {
  const actionable = item.routeStatus === "new";
  return <article className="mailbox-card">
    <header><span>{item.kind.slice(0, 1)}</span><div><div><small>{item.kind}</small>
      <b className={`mailbox-status status-${item.routeStatus}`}>{status[item.routeStatus]}</b></div>
      <h2>{item.title}</h2><p>{item.source || "Incoming item"}</p></div></header>
    <div className="mailbox-suggestion"><span>Suggested room</span><strong>{item.suggestedRoom}</strong>
      {item.documentId ? <button type="button" onClick={onOpen}>Open file</button> : null}</div>
    {actionable ? <div className="mailbox-actions">{actions.map((entry, index) =>
      <button type="button" key={entry.action} className={index === 0 ? "is-primary" : ""}
        disabled={busy || !online || Boolean(entry.needsFile && !item.documentId)}
        onClick={() => onRoute(entry.action)}>{entry.label}</button>)}</div> : null}
    {actionable && !item.documentId ? <p className="mailbox-no-file">The original file is unavailable;
      you can still make a reminder or ignore this legacy item.</p> : null}
  </article>;
}
