import Link from "next/link";

import { UiIcon } from "@/components/UiIcon";
import { stages } from "@/components/driveway/travel-checklist/travel-checklist-model";
import type { TravelChecklistController } from "@/components/driveway/travel-checklist/useTravelChecklistController";

export function TravelChecklistHeader({
  controller,
  backHref,
}: {
  controller: TravelChecklistController;
  backHref: string;
}) {
  return (
    <>
      <header className="flex items-center gap-3">
        <Link
          href={backHref}
          aria-label="Back"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#173c2b]/10 bg-white/80 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72]"
        >
          <UiIcon name="arrow-left" className="h-5 w-5" />
        </Link>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[#b8a071]/45 bg-[#fffaf0] text-[#315b42] shadow-sm">
          <UiIcon name="check" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-[clamp(1.55rem,7vw,2rem)] leading-tight tracking-tight">
            Travel Checklist
          </h1>
          <p className="mt-0.5 text-[11px] text-[#7a5c35]">
            Pack smarter. Travel lighter. Worry less.
          </p>
        </div>
        <button
          type="button"
          onClick={() => controller.setAddOpen(true)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#205238] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#19462f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] focus-visible:ring-offset-2"
        >
          <UiIcon name="plus" className="h-4 w-4" /> Add
        </button>
      </header>

      <section className="mt-5 rounded-[22px] border border-[#b8a071]/25 bg-white/78 p-3 shadow-sm">
        <label
          htmlFor="checklist-trip"
          className="block text-[9px] font-bold uppercase tracking-[0.18em] text-[#667068]"
        >
          Checklist for
        </label>
        <select
          id="checklist-trip"
          value={controller.tripId}
          onChange={(event) => controller.selectTrip(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-[14px] border border-[#173c2b]/10 bg-[#fffdf8] px-3 text-sm font-semibold text-[#173c2b] outline-none focus:border-[#6f8e72]"
        >
          <option value="general">General travel checklist</option>
          {controller.availableTrips.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {trip.title} · {trip.destination}
            </option>
          ))}
        </select>
        {!controller.availableTrips.length ? (
          <p className="mt-2 text-[11px] text-[#667068]">
            Create a trip in{" "}
            <Link
              href="/driveway/trips"
              className="font-semibold text-[#315b42] underline underline-offset-2"
            >
              My Trips
            </Link>{" "}
            to link its own checklist.
          </p>
        ) : null}
      </section>

      <nav
        aria-label="Checklist stages"
        className="mt-4 grid grid-cols-4 gap-1 rounded-[18px] border border-[#b8a071]/25 bg-white/72 p-1 shadow-sm"
      >
        {stages.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => controller.setStage(item.id)}
            aria-current={controller.stage === item.id ? "step" : undefined}
            className={`min-h-[52px] rounded-[14px] px-1 text-[9px] font-bold leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8e72] sm:text-[11px] ${controller.stage === item.id ? "bg-[#205238] text-white shadow-sm" : "text-[#315b42] hover:bg-white"}`}
          >
            <span
              className={`mx-auto mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[9px] ${controller.stage === item.id ? "bg-white/18" : "bg-[#e6ecdf]"}`}
            >
              {index + 1}
            </span>
            {item.label}
          </button>
        ))}
      </nav>
    </>
  );
}
