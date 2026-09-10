import type { LifeCheckSnapshot, LifeCheckTarget } from "@diarydock/life-check";
import type { OfflineStore } from "@diarydock/offline-store";

import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { LifeCheckAnswers } from "./LifeCheckAnswers";
import { useLifeCheck } from "./use-life-check";

export function LifeCheckScreen(props: { accessToken: string; disableOnline?: boolean;
  initialSnapshot?: LifeCheckSnapshot; store: OfflineStore; syncStatus: string; onBack: () => void;
  onNavigate: (destination: MobileDestination) => void; onOpenTarget: (target: LifeCheckTarget) => void }) {
  const life = useLifeCheck(props); const snapshot = life.snapshot;
  return <main className="life-screen"><header className="life-header">
    <button type="button" onClick={props.onBack} aria-label="Back to the Front Gate">‹</button>
    <div><h1>Life Check</h1></div>
    <span className={life.online ? "is-live" : "is-cached"}>{life.online ? "Live" : "Offline copy"}</span>
  </header>
  {life.message ? <p className="life-message" role="status">{life.message}</p> : null}
  {life.loading && !snapshot ? <p className="life-message">Opening Life Check securely…</p> : null}
  {snapshot ? <><section className="life-score"><small>Organisation score</small><div>
    <strong>{snapshot.score}</strong><span>/100</span></div><p>{snapshot.answered === snapshot.totalAnswers
      ? "Based only on the areas you said apply."
      : `${snapshot.answered} of ${snapshot.totalAnswers} Life Check answers complete.`}</p>
    <div className="life-score-bar"><span style={{ width: `${snapshot.score}%` }} /></div></section>
    <LifeCheckAnswers answers={snapshot.answers} disabled={!life.online || life.busy}
      onAnswer={(field, value) => void life.answer(field, value)} />
    {snapshot.categories.length ? <section className="life-categories"><header>
      <h2>Score details</h2></header>
      <div>{snapshot.categories.map((item) => <article key={item.id}><span>{item.label}</span>
        <strong>{item.score}%</strong><div><i style={{ width: `${item.score}%` }} /></div>
        <small>{item.completed} of {item.total} checks complete</small></article>)}</div></section> : null}
    <section className="life-recommendations"><header>
      <h2>Next steps</h2></header>{snapshot.recommendations.length
      ? snapshot.recommendations.map((item) => <button key={item.id} type="button"
        onClick={() => props.onOpenTarget(item.target)}><span>＋</span><div><strong>{item.title}</strong>
          <small>{item.detail}</small></div><b>›</b></button>)
      : <p>✓ All current checks are complete.</p>}</section></> : null}
  <MobileBottomNav active={null} onNavigate={props.onNavigate} /></main>;
}
