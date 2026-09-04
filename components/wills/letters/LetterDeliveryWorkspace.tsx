"use client";

import { useEffect, useState, type FormEvent } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { UiIcon } from "@/components/UiIcon";
import { LetterDeliveryPeople } from "@/components/wills/letters/LetterDeliveryPeople";
import { LetterDeliveryTiming } from "@/components/wills/letters/LetterDeliveryTiming";
import { replaceLetterDelivery } from "@/components/wills/letters/letter-delivery-records";
import {
  LettersLegalNotice,
  LetterSafetyNotice,
  LetterSubpageNav,
} from "@/components/wills/letters/LettersUi";
import { WillPageHeader, formatWillDate } from "@/components/wills/WillUi";
import {
  hydrateLettersRecord,
  type LetterDeliveryPreferences,
} from "@/lib/letter-records";
import type { Reminder } from "@/lib/mock-data";
import { upsertStructuredReminder } from "@/lib/structured-data";

const emptyDelivery: LetterDeliveryPreferences = {
  type: "not-set",
  date: "",
  time: "",
  eventDescription: "",
  reminder: "none",
  intendedPeople: "",
  trustedSettingsReviewed: false,
};

export function LetterDeliveryWorkspace({ letterId }: { letterId: string }) {
  const { state, hydrated, updateState } = useDiaryDockData();
  const record = hydrateLettersRecord(state.willsWishes.lettersOfWishes);
  const letter = record.letters.find((item) => item.id === letterId) ?? null;
  const [delivery, setDelivery] = useState<LetterDeliveryPreferences>(
    letter?.delivery ?? emptyDelivery,
  );
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
    updateState((current) =>
      replaceLetterDelivery(current, letterId, delivery),
    );
    if (delivery.type === "date" && delivery.reminder !== "none" && letter) {
      const reminder: Reminder = {
        id: `letter-delivery-${letterId}`,
        title: `Review delivery preferences: ${letter.title}`,
        note: "Check that the intended people, timing and trusted-person settings are still correct. DiaryDock will not send the letter automatically.",
        roomId: "office",
        roomName: "Office",
        group: "later",
        timeLabel: `${formatWillDate(delivery.date)}${delivery.time ? ` at ${delivery.time}` : ""}`,
        priority: "normal",
      };
      updateState((current) => ({
        ...current,
        reminders: [
          reminder,
          ...current.reminders.filter((item) => item.id !== reminder.id),
        ],
      }));
      try {
        await upsertStructuredReminder(reminder);
      } catch {
        // The preference remains saved if reminder sync is temporarily unavailable.
      }
    }
    setMessage(
      "Delivery preferences saved. Automatic delivery remains inactive.",
    );
  };

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-[680px] rounded-[24px] bg-white/70 p-8 text-sm text-[#667068]">
        Opening delivery preferences…
      </div>
    );
  }
  if (!letter) {
    return (
      <div className="mx-auto w-full max-w-[680px]">
        <WillPageHeader
          title="Letter not found"
          subtitle="This letter is not available in your private records."
          backHref="/wills/letters-of-wishes"
        />
      </div>
    );
  }

  return (
    <form
      onSubmit={save}
      className="mx-auto w-full max-w-[760px] space-y-5 pb-28 sm:max-w-[680px] xl:max-w-[760px]"
    >
      <WillPageHeader
        title="Delivery preferences"
        subtitle="Record when and for whom you would like this letter to be available."
        backHref={`/wills/letters-of-wishes/${letterId}`}
      />
      <LetterSubpageNav letterId={letterId} />
      <LetterDeliveryTiming delivery={delivery} setDelivery={setDelivery} />
      <LetterDeliveryPeople delivery={delivery} setDelivery={setDelivery} />
      <LetterSafetyNotice>
        Automatic delivery is not active. Dates, events and post-death choices
        are recorded only as private preferences until DiaryDock has verified
        identity, consent and release procedures.
      </LetterSafetyNotice>
      {message ? (
        <p
          role="status"
          className="rounded-[15px] bg-[#eef2e9] px-4 py-3 text-sm text-[#45604d]"
        >
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#2f5140] px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"
      >
        <UiIcon name="check" className="h-4 w-4" />
        Save delivery preferences
      </button>
      <LettersLegalNotice />
    </form>
  );
}
