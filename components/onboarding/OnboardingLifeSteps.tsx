import type { HomeTenureAnswer } from "@/lib/diarydock-data";

import {
  ChoiceButton,
  LifeCheckQuestion,
  YesNoChoices,
} from "./OnboardingControls";
import type { OnboardingViewModel } from "./useOnboarding";

export function LifeDetailsStep({ view }: { view: OnboardingViewModel }) {
  const lifeCheck = view.onboarding.lifeCheck;
  return (
    <section className="space-y-4">
      <div className="px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
          Your life
        </p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          What applies to you?
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink/55">
          This keeps your organisation score fair. Choosing “No” excludes that
          area rather than counting it as missing.
        </p>
      </div>
      <div className="estate-sheet space-y-5 p-5">
        <LifeCheckQuestion
          title="Your home"
          detail="Which best describes your current home?"
        >
          <ChoiceButton
            selected={lifeCheck.homeTenure === "own"}
            onClick={() =>
              view.updateLifeCheck("homeTenure", "own" as HomeTenureAnswer)
            }
          >
            Own
          </ChoiceButton>
          <ChoiceButton
            selected={lifeCheck.homeTenure === "rent"}
            onClick={() =>
              view.updateLifeCheck("homeTenure", "rent" as HomeTenureAnswer)
            }
          >
            Rent
          </ChoiceButton>
          <ChoiceButton
            selected={lifeCheck.homeTenure === "other"}
            onClick={() =>
              view.updateLifeCheck("homeTenure", "other" as HomeTenureAnswer)
            }
          >
            Other
          </ChoiceButton>
          <ChoiceButton
            selected={lifeCheck.homeTenure === "not-applicable"}
            onClick={() =>
              view.updateLifeCheck(
                "homeTenure",
                "not-applicable" as HomeTenureAnswer,
              )
            }
          >
            Not applicable
          </ChoiceButton>
        </LifeCheckQuestion>
        <LifeCheckQuestion
          title="Vehicles"
          detail="Do you own or regularly manage a vehicle?"
        >
          <YesNoChoices
            value={lifeCheck.vehicles}
            onChange={(value) => view.updateLifeCheck("vehicles", value)}
          />
        </LifeCheckQuestion>
        <LifeCheckQuestion
          title="Pets"
          detail="Do you have pet records or care to organise?"
        >
          <YesNoChoices
            value={lifeCheck.pets}
            onChange={(value) => view.updateLifeCheck("pets", value)}
          />
        </LifeCheckQuestion>
        <LifeCheckQuestion
          title="International travel"
          detail="Do you organise passports, cover or overseas trips?"
        >
          <YesNoChoices
            value={lifeCheck.internationalTravel}
            onChange={(value) =>
              view.updateLifeCheck("internationalTravel", value)
            }
          />
        </LifeCheckQuestion>
      </div>
    </section>
  );
}
