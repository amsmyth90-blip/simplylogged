"use client";

import Link from "next/link";
import { useEffect } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import {
  AnswerButton,
  AnswerRow,
  BinaryAnswer,
} from "@/components/life-check/LifeCheckAnswers";
import { PageHeader } from "@/components/PageHeader";
import { UiIcon } from "@/components/UiIcon";
import type { HomeTenureAnswer, LifeCheckState } from "@/lib/diarydock-data";
import {
  calculateOrganisationScore,
  isLifeCheckComplete,
} from "@/lib/organisation-score";
import {
  organisationScoreBand,
  PRODUCT_ANALYTICS_EVENTS,
  trackProductAnalytics,
} from "@/lib/product-analytics";

export function LifeCheckWorkspace() {
  const { state, updateState } = useDiaryDockData();
  const lifeCheck = state.onboarding.lifeCheck;
  const result = calculateOrganisationScore(state);

  useEffect(() => {
    void trackProductAnalytics(
      PRODUCT_ANALYTICS_EVENTS.ORGANISATION_SCORE_VIEWED,
      { scoreBand: organisationScoreBand(result.score) },
    );
  }, [result.score]);

  const updateAnswer = <K extends keyof Omit<LifeCheckState, "completedAt">>(
    key: K,
    value: LifeCheckState[K],
  ) => {
    updateState((current) => {
      const nextLifeCheck: LifeCheckState = {
        ...current.onboarding.lifeCheck,
        [key]: value,
        completedAt: undefined,
      };
      if (isLifeCheckComplete(nextLifeCheck))
        nextLifeCheck.completedAt = new Date().toISOString();
      return {
        ...current,
        onboarding: { ...current.onboarding, lifeCheck: nextLifeCheck },
      };
    });
  };

  return (
    <main className="min-h-[100svh] bg-[#f5f1e8] px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] text-[#20352a] sm:px-6">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          eyebrow="Your personal setup"
          title="Life Check"
          subtitle="Tell DiaryDock what applies. Your score only measures the areas you choose."
          backHref="/dashboard"
        />

        <section className="mt-5 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="rounded-[28px] bg-[#315443] p-6 text-white shadow-[0_24px_55px_-38px_rgba(32,53,42,0.9)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
              Organisation score
            </p>
            <div className="mt-3 flex items-end gap-2">
              <span className="font-serif text-6xl leading-none">
                {result.score}
              </span>
              <span className="pb-1 text-xl text-white/60">/100</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/75">
              {result.answered === result.totalAnswers
                ? "Based only on the areas you said apply."
                : `${result.answered} of ${result.totalAnswers} Life Check answers complete.`}
            </p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-[#d8c38f] transition-all"
                style={{ width: `${result.score}%` }}
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-sm sm:p-6">
            <h2 className="font-serif text-2xl">What applies to you?</h2>
            <p className="mt-1 text-sm leading-6 text-[#667068]">
              Change these whenever life changes. “No” removes that whole
              category from the score.
            </p>
            <div className="mt-5 space-y-5">
              <AnswerRow
                title="Your home"
                detail="Which best describes your current home?"
              >
                {(
                  [
                    "own",
                    "rent",
                    "other",
                    "not-applicable",
                  ] as HomeTenureAnswer[]
                ).map((answer) => (
                  <AnswerButton
                    key={answer}
                    selected={lifeCheck.homeTenure === answer}
                    onClick={() => updateAnswer("homeTenure", answer)}
                  >
                    {answer === "not-applicable"
                      ? "Not applicable"
                      : answer[0]?.toUpperCase() + answer.slice(1)}
                  </AnswerButton>
                ))}
              </AnswerRow>
              <BinaryAnswer
                title="Vehicles"
                detail="A vehicle you own or regularly manage"
                value={lifeCheck.vehicles}
                onChange={(value) => updateAnswer("vehicles", value)}
              />
              <BinaryAnswer
                title="Pets"
                detail="Pet records, cover or care"
                value={lifeCheck.pets}
                onChange={(value) => updateAnswer("pets", value)}
              />
              <BinaryAnswer
                title="International travel"
                detail="Passports, cover or overseas trips"
                value={lifeCheck.internationalTravel}
                onChange={(value) => updateAnswer("internationalTravel", value)}
              />
              <BinaryAnswer
                title="Household collaboration"
                detail="Organising some things with another person"
                value={lifeCheck.householdCollaboration}
                onChange={(value) =>
                  updateAnswer("householdCollaboration", value)
                }
              />
              <BinaryAnswer
                title="Private document storage"
                detail="Keeping important files in DiaryDock"
                value={lifeCheck.documentStorage}
                onChange={(value) => updateAnswer("documentStorage", value)}
              />
              <BinaryAnswer
                title="Reminders"
                detail="Keeping useful dates in view"
                value={lifeCheck.reminders}
                onChange={(value) => updateAnswer("reminders", value)}
              />
            </div>
          </div>
        </section>

        {result.categories.length ? (
          <section className="mt-5 rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-sm sm:p-6">
            <h2 className="font-serif text-2xl">How the score is worked out</h2>
            <p className="mt-1 text-sm leading-6 text-[#667068]">
              Every included category shows its exact completed checks. Nothing
              is guessed by AI.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {result.categories.map((category) => (
                <div key={category.id} className="rounded-2xl bg-[#f5f4ed] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">
                      {category.label}
                    </span>
                    <span className="text-sm font-bold text-[#52705a]">
                      {category.score}%
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#315443]/10">
                    <div
                      className="h-full rounded-full bg-[#6f8e72]"
                      style={{ width: `${category.score}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[#667068]">
                    {category.completed} of {category.total} checks complete
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789078]">
                Useful next steps
              </p>
              <h2 className="mt-1 font-serif text-2xl">
                Improve what matters to you
              </h2>
            </div>
          </div>
          {result.recommendations.length ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {result.recommendations.map((recommendation) => (
                <Link
                  key={`${recommendation.categoryId}:${recommendation.id}`}
                  href={recommendation.href}
                  className="group flex min-h-28 items-start gap-3 rounded-[22px] border border-white/85 bg-white/85 p-4 shadow-sm transition hover:-translate-y-0.5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8efe5] text-[#52705a]">
                    <UiIcon name="plus" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {recommendation.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[#667068]">
                      {recommendation.detail}
                    </span>
                  </span>
                  <UiIcon
                    name="chevron-right"
                    className="mt-3 h-4 w-4 text-[#789078] transition group-hover:translate-x-1"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-[24px] bg-[#e8efe5] p-5 text-sm text-[#52705a]">
              <UiIcon name="check" className="mb-2 h-5 w-5" />
              All current checks are complete.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
