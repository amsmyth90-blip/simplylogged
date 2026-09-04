import type { HomeHandoverDetail,
  HomeHandoverDetailRequest } from "@diarydock/home-handover";

type Props = {
  detail: HomeHandoverDetail | null;
  loading: boolean;
  request: HomeHandoverDetailRequest;
  summary: string;
  onLoad: (request: HomeHandoverDetailRequest) => Promise<unknown>;
};

export function HomeHandoverDetailText(props: Props) {
  const text = props.detail?.detail || props.summary;
  if (text || props.detail) {
    return <span className="handover-detail-text">{text || "No additional details recorded."}</span>;
  }
  return (
    <button
      type="button"
      className="handover-detail-button"
      disabled={props.loading}
      onClick={() => void props.onLoad(props.request)}
    >
      {props.loading ? "Opening details…" : "Open full details"}
    </button>
  );
}
