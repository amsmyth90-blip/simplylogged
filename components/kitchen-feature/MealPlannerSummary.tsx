import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import type { MealPlannerController } from "@/components/kitchen-feature/useMealPlannerController";

export function MealPlannerSummary({
  planner,
}: {
  planner: MealPlannerController;
}) {
  return (
    <section className="shrink-0 rounded-[22px] border border-[#d7e3d1] bg-[#f1f6ee]/92 p-3 shadow-[0_14px_30px_-24px_rgba(35,54,43,0.55)]">
      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#718c65]">
        Tonight -{" "}
        {planner.selectedDate.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "short",
        })}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <h2
          className={`min-w-0 flex-1 truncate text-base font-semibold tracking-tight ${planner.selectedMeal ? "" : "text-slate-400"}`}
        >
          {planner.selectedMeal?.name ?? "No meal planned"}
        </h2>
        <span className="rounded-full bg-white/70 px-2 py-1 text-[7px] font-bold uppercase tracking-wide text-[#6f8564]">
          {planner.repositoryMode === "supabase" ? "Synced" : "This device"}
        </span>
      </div>
      <p className="mt-1 flex items-center gap-3 text-[9px] text-slate-500">
        <span className="flex items-center gap-1">
          <UiIcon name="clock" className="h-3 w-3" />
          {planner.selectedMeal?.cookTime ?? "Choose a meal"}
        </span>
        <span className="flex items-center gap-1">
          <UiIcon name="users" className="h-3 w-3" />
          {planner.selectedMeal?.servings ?? (planner.diners.length || 1)}{" "}
          servings
        </span>
      </p>
      <p className="mt-1 truncate text-[9px] text-slate-500">
        {planner.selectedMeal?.note ?? "Add a meal to complete this day."}
      </p>
      <div className="mt-2 flex gap-1.5">
        {planner.selectedMeal ? (
          <>
            {planner.selectedRecipe ? (
              <Link
                href={`/kitchen/recipes?recipe=${encodeURIComponent(planner.selectedRecipe.id)}&cook=1`}
                className="rounded-full bg-[#263b35] px-3 py-1.5 text-[9px] font-semibold text-white"
              >
                Cook
              </Link>
            ) : null}
            <button
              type="button"
              onClick={planner.openEditor}
              className="rounded-full bg-[#6f8b62] px-4 py-1.5 text-[9px] font-semibold text-white"
            >
              Edit meal
            </button>
            <button
              type="button"
              onClick={() => planner.setSheetMode("swap")}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold text-slate-700"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => planner.setSheetMode("move")}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold text-slate-700"
            >
              Move
            </button>
            <button
              type="button"
              onClick={() => planner.setMeal(planner.selectedKey, null)}
              className="ml-auto flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-500"
              aria-label="Clear meal"
            >
              ×
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={planner.openEditor}
            className="rounded-full bg-[#6f8b62] px-5 py-1.5 text-[9px] font-semibold text-white"
          >
            Add meal
          </button>
        )}
      </div>
    </section>
  );
}

export function MealPlannerDiners({
  planner,
}: {
  planner: MealPlannerController;
}) {
  const colours = [
    "bg-[#dce8d6] text-[#58704f]",
    "bg-[#dbe8ec] text-[#50727b]",
    "bg-[#efdcd5] text-[#8b6154]",
    "bg-[#f1e7c8] text-[#79612d]",
  ];
  return (
    <section className="flex h-11 shrink-0 items-center rounded-[18px] border border-white/90 bg-white/72 px-3 shadow-sm backdrop-blur-xl">
      <span className="text-[10px] font-semibold text-slate-600">
        Who&apos;s eating?
      </span>
      <div className="ml-auto flex items-center -space-x-1.5">
        {planner.mealProfiles.slice(0, 4).map((profile, index) => {
          const active = planner.diners.includes(profile.id);
          const initials =
            profile.name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join("") || "LD";
          return (
            <button
              key={profile.id}
              type="button"
              title={profile.name}
              onClick={() =>
                planner.setDiners((current) =>
                  active
                    ? current.filter((item) => item !== profile.id)
                    : [...current, profile.id],
                )
              }
              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[8px] font-bold shadow-sm ${active ? colours[index % 4] : "bg-slate-100 text-slate-400"}`}
              aria-pressed={active}
              aria-label={`${active ? "Remove" : "Add"} ${profile.name} ${active ? "from" : "to"} dinner`}
            >
              {initials}
            </button>
          );
        })}
        <Link
          href="/family/household"
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-slate-500 shadow-sm"
          aria-label="Manage household diners"
        >
          <UiIcon name="plus" className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}
