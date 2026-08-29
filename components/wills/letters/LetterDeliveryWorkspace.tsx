"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon, type IconName } from "@/components/UiIcon";
import { WillCard, WillPageHeader, WillSectionHeading, formatWillDate } from "@/components/wills/WillUi";
import { LettersLegalNotice, LetterSafetyNotice, LetterSubpageNav } from "@/components/wills/letters/LettersUi";
import { hydrateLettersRecord, type LetterDeliveryPreferences, type LetterDeliveryType } from "@/lib/letter-records";
import type { DiaryDockAppState } from "@/lib/diarydock-data";
import type { Reminder } from "@/lib/mock-data";
import { upsertStructuredReminder } from "@/lib/structured-data";

const deliveryOptions: Array<{ value: LetterDeliveryType; title: string; description: string; icon: IconName }> = [
  { value: "now", title: "Available now", description: "Record that you are happy to share it now", icon: "clock" },
  { value: "date", title: "Choose a date", description: "Record a future date and time", icon: "calendar" },
  { value: "event", title: "After an event", description: "Describe the life event you have in mind", icon: "heart" },
  { value: "after-death", title: "When I pass away", description: "Requires a future verified post-death process", icon: "shield" }
];

function replaceDelivery(state: DiaryDockAppState, letterId: string, delivery: LetterDeliveryPreferences) {
  const record = hydrateLettersRecord(state.willsWishes.lettersOfWishes);
  const now = new Date().toISOString();
  return {
    ...state,
    willsWishes: {
      ...state.willsWishes,
      lettersOfWishes: {
        letters: record.letters.map((letter) => letter.id === letterId ? { ...letter, delivery, deliveryActivation: "not-active" as const, updatedAt: now } : letter),
        updatedAt: now
      }
    }
  };
}
export function LetterDeliveryWorkspace({ letterId }: { letterId: string }) {
  const { state, hydrated, updateState } = useDiaryDockData();
  const record = hydrateLettersRecord(state.willsWishes.lettersOfWishes);
  const letter = record.letters.find((item) => item.id === letterId) ?? null;
  const [delivery, setDelivery] = useState<LetterDeliveryPreferences>(letter?.delivery ?? {
    type: "not-set", date: "", time: "", eventDescription: "", reminder: "none", intendedPeople: "", trustedSettingsReviewed: false
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (hydrated && letter) setDelivery(letter.delivery);
  }, [hydrated, letter]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (delivery.type === "date" && !delivery.date) {
      setMessage("Choose the intended date before saving these preferences.");
      return;
    }
    if (delivery.type === "event" && !delivery.eventDescription.trim()) {
      setMessage("Describe the event you have in mind.");
      return;
    }
    updateState((current) => replaceDelivery(current, letterId, delivery));

    if (delivery.type === "date" && delivery.reminder !== "none" && letter) {
      const reminder: Reminder = {
        id: `letter-delivery-${letterId}`,
        title: `Review delivery preferences: ${letter.title}`,
        note: "Check that the intended people, timing and trusted-person settings are still correct. DiaryDock will not send the letter automatically.",
        roomId: "office",
        roomName: "Office",
        group: "later",
        timeLabel: `${formatWillDate(delivery.date)}${delivery.time ? ` at ${delivery.time}` : ""}`,
        priority: "normal"
      };
      updateState((current) => ({ ...current, reminders: [reminder, ...current.reminders.filter((item) => item.id !== reminder.id)] }));
      try { await upsertStructuredReminder(reminder); } catch { /* The preference remains saved even if reminder sync is temporarily unavailable. */ }
    }
    setMessage("Delivery preferences saved. Automatic delivery remains inactive.");
  };

  if (!hydrated) return <div className="mx-auto w-full max-w-[680px] rounded-[24px] bg-white/70 p-8 text-sm text-[#667068]">Opening delivery preferences…</div>;
  if (!letter) return <div className="mx-auto w-full max-w-[680px]"><WillPageHeader title="Letter not found" subtitle="This letter is not available in your private records." backHref="/wills/letters-of-wishes" /></div>;

  return (
    <form onSubmit={save} className="mx-auto w-full max-w-[760px] space-y-5 pb-28 sm:max-w-[680px] xl:max-w-[760px]">
      <WillPageHeader title="Delivery preferences" subtitle="Record when and for whom you would like this letter to be available." backHref={`/wills/letters-of-wishes/${letterId}`} />
      <LetterSubpageNav letterId={letterId} />

      <WillCard className="relative overflow-hidden bg-[#f5f1e7] text-center">
        <Image src="/images/wills-botanical-leaves.svg" alt="" width={208} height={208} aria-hidden="true" className="pointer-events-none absolute -left-16 -top-20 h-52 w-52 -rotate-12 opacity-25" />
        <span className="relative mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#6f8e72]/30 bg-white/70 text-[#52705a]"><UiIcon name="heart" className="h-6 w-6" /></span>
        <h2 className="relative mt-3 font-serif text-2xl text-[#20352a]">When should this letter be available?</h2>
        <p className="relative mt-1 text-xs text-[#667068]">You can change this preference at any time.</p>
      </WillCard>

      <fieldset className="space-y-3"><legend className="sr-only">Delivery preference</legend>{deliveryOptions.map((option) => <label key={option.value} className={`flex min-h-[76px] cursor-pointer items-center gap-3 rounded-[18px] border bg-white px-4 py-3 shadow-[0_14px_30px_-28px_rgba(32,53,42,0.55)] transition focus-within:ring-2 focus-within:ring-[#6f8e72] motion-reduce:transition-none ${delivery.type === option.value ? "border-[#6f8e72]/45" : "border-[#20352a]/[0.07]"}`}><input type="radio" name="deliveryType" value={option.value} checked={delivery.type === option.value} onChange={(event) => setDelivery((current) => ({ ...current, type: event.target.value as LetterDeliveryType }))} className="h-5 w-5 accent-[#52705a]" /><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#eef2e9] text-[#52705a]"><UiIcon name={option.icon} className="h-[18px] w-[18px]" /></span><span><span className="block text-sm font-semibold text-[#20352a]">{option.title}</span><span className="mt-0.5 block text-[11px] leading-4 text-[#667068]">{option.description}</span></span></label>)}</fieldset>

      {delivery.type === "date" ? <WillCard><WillSectionHeading icon="calendar" title="Date and reminder" /><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block"><span className="text-sm font-semibold text-[#20352a]">Date</span><input type="date" value={delivery.date} onChange={(event) => setDelivery((current) => ({ ...current, date: event.target.value }))} className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm text-[#20352a]" /></label><label className="block"><span className="text-sm font-semibold text-[#20352a]">Time</span><input type="time" value={delivery.time} onChange={(event) => setDelivery((current) => ({ ...current, time: event.target.value }))} className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm text-[#20352a]" /></label></div><label className="mt-4 block"><span className="text-sm font-semibold text-[#20352a]">Remind me to review</span><select value={delivery.reminder} onChange={(event) => setDelivery((current) => ({ ...current, reminder: event.target.value as LetterDeliveryPreferences["reminder"] }))} className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm text-[#20352a]"><option value="none">No reminder</option><option value="1-day">1 day before</option><option value="7-days">7 days before</option><option value="30-days">30 days before</option></select></label></WillCard> : null}

      {delivery.type === "event" ? <WillCard><label className="block"><span className="text-sm font-semibold text-[#20352a]">Event or milestone</span><textarea value={delivery.eventDescription} onChange={(event) => setDelivery((current) => ({ ...current, eventDescription: event.target.value }))} rows={4} className="mt-2 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 py-3 text-sm leading-6 text-[#20352a]" placeholder="For example, their wedding day or eighteenth birthday" /></label></WillCard> : null}

      <WillCard>
        <WillSectionHeading icon="users" title="Intended people" description="Names here record your wishes; they do not create access permissions." />
        <label className="mt-4 block"><span className="text-sm font-semibold text-[#20352a]">Who should receive or access it?</span><input value={delivery.intendedPeople} onChange={(event) => setDelivery((current) => ({ ...current, intendedPeople: event.target.value }))} className="mt-2 min-h-12 w-full rounded-[15px] border border-[#20352a]/10 bg-white px-3 text-sm text-[#20352a]" placeholder="Names or relationships" /></label>
        <label className="mt-4 flex min-h-12 items-start gap-3 rounded-[15px] bg-[#f1f3ec] px-3 py-3 text-[12px] leading-5 text-[#294436]"><input type="checkbox" checked={delivery.trustedSettingsReviewed} onChange={(event) => setDelivery((current) => ({ ...current, trustedSettingsReviewed: event.target.checked }))} className="mt-0.5 h-5 w-5 shrink-0 accent-[#52705a]" />I have reviewed my trusted-person settings. This does not activate delivery or grant access.</label>
        <Link href="/family" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-[#6f8e72]/30 px-4 text-sm font-semibold text-[#294436]"><UiIcon name="shield" className="h-4 w-4" />Open trusted-person settings</Link>
      </WillCard>

      <LetterSafetyNotice>Automatic delivery is not active. Dates, events and post-death choices are recorded only as private preferences until DiaryDock has verified identity, consent and release procedures.</LetterSafetyNotice>
      {message ? <p role="status" className="rounded-[15px] bg-[#eef2e9] px-4 py-3 text-sm text-[#45604d]">{message}</p> : null}
      <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#2f5140] px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"><UiIcon name="check" className="h-4 w-4" />Save delivery preferences</button>
      <LettersLegalNotice />
    </form>
  );
}
