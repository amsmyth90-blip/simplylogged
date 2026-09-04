import type { OfficeCorrespondence } from "@diarydock/office";

import { formatOfficeDate } from "./office-bills-format";

function statusLabel(item: OfficeCorrespondence) {
  if (item.reviewStatus === "needs-review") return "Check";
  if (item.status === "action-needed") return "Action";
  if (item.status === "completed") return "Done";
  return "Unread";
}

export function CorrespondencePanel({
  correspondence,
  loadingCorrespondenceId,
  onEdit,
}: {
  correspondence: OfficeCorrespondence[];
  loadingCorrespondenceId: string;
  onEdit: (item: OfficeCorrespondence) => Promise<void>;
}) {
  if (!correspondence.length) {
    return <p className="office-empty">No correspondence has been added yet.</p>;
  }
  return (
    <div className="office-bill-list">
      {correspondence.map((item) => (
        <button
          type="button"
          className="office-bill-row"
          key={item.id}
          disabled={Boolean(loadingCorrespondenceId)}
          onClick={() => void onEdit(item)}
        >
          <span className={`office-bill-icon office-correspondence-${item.status}`}>✉</span>
          <span>
            <strong>{item.title}</strong>
            <small>
              {loadingCorrespondenceId === item.id ? "Opening full details…"
                : `${item.sender || item.folder} · ${item.receivedDate
                ? formatOfficeDate(item.receivedDate)
                : "Date not recorded"}`}
            </small>
          </span>
          <b>{statusLabel(item)}</b>
        </button>
      ))}
    </div>
  );
}
