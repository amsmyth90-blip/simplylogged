import { useEffect, useRef, useState } from "react";
import { Browser } from "@capacitor/browser";

import { PRICING_PLANS, formatPlanPrice, type PaidPlanId } from "../../../../lib/pricing";
import type { MobileSettingsSummary } from "@mobile/settings/settings-client";
import "./subscriptions.css";

type Props = {
  onBack: () => void;
  storage?: MobileSettingsSummary["storage"];
};

export function SubscriptionScreen({ onBack, storage }: Props) {
  const [selected, setSelected] = useState<PaidPlanId>("STARTER");
  const [reviewing, setReviewing] = useState(false);
  const [message, setMessage] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const plan = PRICING_PLANS.find((item) => item.id === selected)!;

  useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, [reviewing]);

  async function openPolicy(path: "/terms" | "/privacy") {
    try {
      await Browser.open({ url: `https://diarydock.com${path}` });
    } catch {
      setMessage(`Unable to open this page. You can visit diarydock.com${path} in your browser.`);
    }
  }

  return (
    <main className="subscription-screen">
      <header className="subscription-header">
        <button type="button" className="subscription-back"
          onClick={() => { if (reviewing) { setReviewing(false); setMessage(""); } else onBack(); }}>
          <span aria-hidden="true">‹</span> {reviewing ? "All plans" : "Settings"}
        </button>
        <span className="subscription-brand">DiaryDock</span>
      </header>
      <section className="subscription-intro">
        <p className="subscription-eyebrow">Your home, safely organised</p>
        <h1 ref={heading} tabIndex={-1}>{reviewing ? "Your plan, at a glance" : "A little more room for life"}</h1>
        <p>{reviewing ? "Review the storage and monthly price before subscriptions launch."
          : "Choose the space you need for your household documents."}</p>
      </section>

      <aside className="subscription-notice">
        <strong>Subscriptions are coming soon</strong>
        <p>You can explore plans now. Purchasing and restoring subscriptions will be available at launch. No payment will be taken.</p>
      </aside>

      {reviewing ? (
        <section className="subscription-review" aria-label="Selected plan details">
          <p className="subscription-eyebrow">Selected plan</p>
          <h2>{plan.name}</h2>
          <p className="subscription-review-price">{formatPlanPrice(plan.monthlyPricePence)} <span>/ month</span></p>
          <dl>
            <div><dt>Document storage</dt><dd>{plan.storageGb} GB</dd></div>
            <div><dt>Billing period</dt><dd>Monthly</dd></div>
            <div><dt>Storage allocation</dt><dd>Per account</dd></div>
            <div><dt>Due today</dt><dd>No charge</dd></div>
          </dl>
          <p className="subscription-small">This selection does not start a subscription or change your current storage.</p>
          <button type="button" className="subscription-primary" disabled>Purchasing available at launch</button>
        </section>
      ) : (
        <>
          <fieldset className="subscription-plans">
            <legend>Choose a monthly plan</legend>
            {PRICING_PLANS.map((item) => (
              <label key={item.id} className={`subscription-plan ${selected === item.id ? "is-selected" : ""}`}>
                <input type="radio" name="subscription-plan" value={item.id}
                  checked={selected === item.id} onChange={() => setSelected(item.id)} />
                <span className="subscription-plan-copy">
                  <strong>{item.name}</strong>
                  <span>{item.storageGb} GB document storage</span>
                </span>
                <span className="subscription-plan-price">
                  <strong>{formatPlanPrice(item.monthlyPricePence)}</strong><span>/ month</span>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="subscription-small">Monthly prices shown in GBP. Storage is per account, including Family.</p>
          <button type="button" className="subscription-primary" onClick={() => { setMessage(""); setReviewing(true); }}>
            Review {plan.name} plan <span aria-hidden="true">→</span>
          </button>
          {storage ? (
            <section className="subscription-current">
              <h2>Your current storage</h2>
              <p>{(storage.usedBytes / 1024 ** 3).toFixed(2)} GB used of {(storage.limitBytes / 1024 ** 3).toFixed(2)} GB</p>
              <p className="subscription-small">Your allowance stays the same while you explore these plans.</p>
            </section>
          ) : null}
        </>
      )}

      <section className="subscription-help" aria-label="Subscription help">
        <button type="button" onClick={() => setMessage("Restore purchases will be available once App Store and Google Play subscriptions launch. No restore was attempted.")}>Restore purchases</button>
        <button type="button" onClick={() => setMessage("Subscription management will be available once purchasing launches. No subscription has been changed.")}>Manage subscription</button>
      </section>
      <p className="subscription-status" role="status">{message}</p>
      <footer className="subscription-footer">
        <button type="button" onClick={() => void openPolicy("/terms")}>Terms</button>
        <span aria-hidden="true">·</span>
        <button type="button" onClick={() => void openPolicy("/privacy")}>Privacy policy</button>
      </footer>
    </main>
  );
}
