import type { KitchenNotice } from "@diarydock/kitchen";

export function NoticeArchive(props: {
  busy: boolean;
  completed: KitchenNotice[];
  notices: KitchenNotice[];
  online: boolean;
  onClose: () => void;
  onRestore: (notice: KitchenNotice) => void;
}) {
  return (
    <div className="notice-modal-backdrop" onClick={props.onClose}>
      <section className="notice-modal notice-archive" role="dialog" aria-modal="true"
        aria-label="Notice archive and weekly summary" onClick={(event) => event.stopPropagation()}>
        <div className="notice-drag-handle" />
        <header><div><small>This week at home</small><h2>Family board summary</h2></div>
          <button type="button" onClick={props.onClose} aria-label="Close archive">×</button></header>
        <div className="notice-summary">
          <article><strong>{props.completed.length}</strong><span>completed this week</span></article>
          <p>{props.completed.length
            ? `${props.completed.slice(0, 2).map((notice) => notice.title).join(" and ")} moved forward.`
            : "The board is ready for the week ahead."}</p>
        </div>
        <div className="notice-archive-title"><strong>Archive</strong><span>{props.notices.length} notes</span></div>
        <div className="notice-archive-list">
          {props.notices.map((notice) => (
            <article key={notice.id}><span className={`is-${notice.colour}`} /><div>
              <strong>{notice.title}</strong><small>{notice.category} · {notice.assignedTo}</small>
            </div><button type="button" disabled={props.busy || !props.online}
              onClick={() => props.onRestore(notice)}>Restore</button></article>
          ))}
          {!props.notices.length ? <p>No archived notes yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
