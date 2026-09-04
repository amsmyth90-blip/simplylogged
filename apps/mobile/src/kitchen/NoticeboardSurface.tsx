import {
  noticeCategories,
  type KitchenNotice,
  type NoticeCategory,
} from "@diarydock/kitchen";

type NoticeFilter = "All" | NoticeCategory;

type NoticeboardSurfaceProps = {
  archivedCount: number;
  filter: NoticeFilter;
  loading: boolean;
  notices: KitchenNotice[];
  online: boolean;
  source: "CACHE" | "NETWORK";
  onAdd: () => void;
  onArchive: () => void;
  onBack: () => void;
  onEdit: (notice: KitchenNotice) => void;
  onFilter: (filter: NoticeFilter) => void;
};

export function NoticeboardSurface(props: NoticeboardSurfaceProps) {
  return (
    <>
      <header className="noticeboard-header">
        <button type="button" className="notice-round-button" onClick={props.onBack}
          aria-label="Back to Kitchen">‹</button>
        <div className="noticeboard-heading">
          <small>Kitchen</small>
          <h1>Family noticeboard</h1>
        </div>
        <button type="button" className="notice-round-button notice-archive-button"
          onClick={props.onArchive} aria-label="Open notice archive and weekly summary">
          ▣{props.archivedCount ? <span>{props.archivedCount}</span> : null}
        </button>
        <button type="button" className="notice-add-button" disabled={props.loading || !props.online}
          onClick={props.onAdd} aria-label={props.online ? "Add a notice" : "Connect to add a notice"}>＋</button>
      </header>

      <div className="notice-status-line">
        <span className={props.source === "NETWORK" ? "is-live" : "is-cached"}>
          {props.source === "NETWORK" ? "Live & encrypted" : "Encrypted offline copy"}
        </span>
      </div>

      <div className="notice-filters" role="tablist" aria-label="Notice categories">
        {noticeCategories.map((category) => (
          <button type="button" role="tab" aria-selected={props.filter === category}
            className={props.filter === category ? "is-active" : ""}
            onClick={() => props.onFilter(category)} key={category}>{category}</button>
        ))}
      </div>

      <section className="notice-corkboard" aria-label="Family notices">
        <div className="notice-cork-texture" aria-hidden="true" />
        <div className="notice-card-grid">
          {props.notices.map((notice) => (
            <button type="button" className={`notice-card is-${notice.colour}${notice.completed ? " is-complete" : ""}`}
              onClick={() => props.onEdit(notice)} key={notice.id}>
              <span className="notice-pin" aria-hidden="true" />
              <small>{notice.category}</small>
              <strong>{notice.title}</strong>
              {notice.detail ? <p>{notice.detail}</p> : null}
              <footer><span>{notice.assignedTo}</span><span>{notice.due}</span></footer>
              {notice.completed ? <b aria-label="Completed">✓</b> : null}
            </button>
          ))}
          {!props.notices.length ? (
            <button type="button" className="notice-empty-card" onClick={props.onAdd}
              disabled={!props.online}>
              <span>＋</span><strong>Pin the first note</strong>
              <small>Nothing is pinned in {props.filter === "All" ? "the board" : props.filter} yet.</small>
            </button>
          ) : null}
        </div>
      </section>
    </>
  );
}
