import { useState } from "react";

import type { AskResponse, SearchResult } from "@diarydock/search";

import { askDiaryDock } from "./search-client";

const examples = [
  "What expires in the next three months?",
  "When is my car insurance due?",
  "Which documents still need review?",
];

export function AskPanel(props: {
  accessToken: string;
  disabled?: boolean;
  onOpen: (result: SearchResult) => void;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const clean = question.trim().replace(/\s+/g, " ");
    if (clean.length < 2 || clean.length > 300) {
      setError("Ask a question between 2 and 300 characters.");
      return;
    }
    if (props.disabled || !navigator.onLine) {
      setError("Ask DiaryDock needs an internet connection so it can check your authorised records.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setAnswer(await askDiaryDock(props.accessToken, clean));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ask DiaryDock is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ask-panel">
      <div className="ask-intro"><span>✦</span><div><h2>Ask DiaryDock</h2><p>Answers use only records you are allowed to open.</p></div></div>
      <form onSubmit={(event) => void submit(event)}>
        <label htmlFor="ask-question">Your question</label>
        <textarea id="ask-question" value={question} maxLength={300} onChange={(event) => setQuestion(event.target.value)} placeholder="What would you like to find?" />
        <button type="submit" disabled={loading}>{loading ? "Checking your records…" : "Ask securely"}</button>
      </form>
      <div className="ask-examples" aria-label="Example questions">
        {examples.map((example) => <button type="button" key={example} onClick={() => setQuestion(example)}>{example}</button>)}
      </div>
      {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
      {answer ? (
        <article className="ask-answer">
          <span>{answer.usedAI ? "AI-assisted answer" : "Direct record summary"}</span>
          <p>{answer.answer}</p>
          {answer.citations.length ? <h3>Sources</h3> : null}
          {answer.citations.map((citation) => (
            <button type="button" key={citation.id} onClick={() => props.onOpen(citation)}>
              <strong>{citation.title}</strong><small>{citation.detail}</small>
            </button>
          ))}
        </article>
      ) : null}
    </section>
  );
}
