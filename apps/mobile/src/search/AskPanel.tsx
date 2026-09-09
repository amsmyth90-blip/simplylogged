import { useEffect, useRef, useState } from "react";

import type { AskResponse, SearchResult } from "@diarydock/search";

import { askDiaryDock } from "./search-client";

const examples = [
  "When is my MOT due?",
  "What expires in the next three months?",
  "Which documents still need review?",
];

type AskTurn = {
  id: string;
  question: string;
  response: AskResponse;
};

export function AskPanel(props: {
  accessToken: string;
  disabled?: boolean;
  onOpen: (result: SearchResult) => void;
}) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<AskTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [loading, turns]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const clean = question.trim().replace(/\s+/g, " ");
    if (clean.length < 2 || clean.length > 300) {
      setError("Ask a question between 2 and 300 characters.");
      return;
    }
    if (props.disabled || !navigator.onLine) {
      setError("Ask DiaryDock needs an internet connection to check your authorised records.");
      return;
    }
    setQuestion("");
    setLoading(true);
    setError(null);
    try {
      const response = await askDiaryDock(props.accessToken, clean);
      setTurns((current) => [...current, {
        id: `${Date.now()}-${current.length}`,
        question: clean,
        response,
      }]);
    } catch (reason) {
      setQuestion(clean);
      setError(reason instanceof Error ? reason.message : "Ask DiaryDock is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ask-panel">
      {turns.length ? <div className="ask-actions">
        <button type="button" onClick={() => { setTurns([]); setError(null); }}>New chat</button>
      </div> : null}

      <div className="ask-thread" aria-live="polite">
        <article className="ask-bubble is-assistant">
          <span className="ask-avatar" aria-hidden="true">D</span>
          <div><strong>DiaryDock</strong><p>Ask me about dates, renewals, vehicles, policies, reminders or files.</p></div>
        </article>
        {!turns.length ? <div className="ask-examples" aria-label="Example questions">
          {examples.map((example) => <button type="button" key={example} onClick={() => setQuestion(example)}>{example}</button>)}
        </div> : null}
        {turns.map((turn) => <div className="ask-turn" key={turn.id}>
          <article className="ask-bubble is-user"><div><strong>You</strong><p>{turn.question}</p></div></article>
          <article className="ask-bubble is-assistant">
            <span className="ask-avatar" aria-hidden="true">D</span>
            <div className="ask-response">
              <strong>{turn.response.usedAI ? "DiaryDock answer" : "Record summary"}</strong>
              <p>{turn.response.answer}</p>
              {turn.response.citations.length ? <div className="ask-sources">
                <small>Sources checked</small>
                {turn.response.citations.map((citation) => <button type="button" key={citation.id} onClick={() => props.onOpen(citation)}>
                  <b>{citation.title}</b><span>{citation.detail || citation.badge || "DiaryDock record"}</span>
                </button>)}
              </div> : null}
            </div>
          </article>
        </div>)}
        {loading ? <article className="ask-bubble is-assistant is-thinking">
          <span className="ask-avatar" aria-hidden="true">D</span><div><strong>DiaryDock</strong><p>Checking your authorised records…</p></div>
        </article> : null}
        <div ref={endRef} />
      </div>

      {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
      <form className="ask-composer" onSubmit={(event) => void submit(event)}>
        <label htmlFor="ask-question">Ask a question</label>
        <div>
          <textarea id="ask-question" rows={2} value={question} maxLength={300}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
            }}
            placeholder="For example, when is my MOT due?" />
          <button type="submit" disabled={loading || question.trim().length < 2} aria-label="Send question">↑</button>
        </div>
        <small>DiaryDock cannot change or share records. Check source files before important decisions.</small>
      </form>
    </section>
  );
}
