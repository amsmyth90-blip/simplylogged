import type { SearchResult } from "@diarydock/search";

type SearchResultsProps = {
  loading: boolean;
  results: SearchResult[];
  onOpen: (result: SearchResult) => void;
};

function displayDate(value?: string) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}

export function SearchResults(props: SearchResultsProps) {
  return (
    <section className="search-results" aria-live="polite" aria-busy={props.loading}>
      <div className="search-result-heading">
        <h2>Results</h2><span>{props.results.length}</span>
      </div>
      {props.results.map((result) => (
        <button type="button" key={result.id} onClick={() => props.onOpen(result)}>
          <span className={`result-icon result-${result.category}`} aria-hidden="true">
            {result.category === "documents" ? "▤" : result.category === "reminders" ? "◷" : "⌂"}
          </span>
          <span className="result-copy">
            <strong>{result.title}</strong>
            {result.detail ? <small>{result.detail}</small> : null}
            {result.dueAt ? <small>{displayDate(result.dueAt)}</small> : null}
          </span>
          {result.badge ? <span className="result-badge">{result.badge}</span> : null}
          <span aria-hidden="true">›</span>
        </button>
      ))}
      {!props.loading && !props.results.length ? (
        <div className="search-empty"><strong>No matching records</strong><p>Try a name, category, item or date.</p></div>
      ) : null}
    </section>
  );
}
