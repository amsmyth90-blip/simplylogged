type CoverageItem = readonly [string, string, string];

export function CoverageList({ items }: { items: readonly CoverageItem[] }) {
  return (
    <section className="rounded-[1.35rem] bg-white p-4 shadow-sm shadow-stone-200">
      <h2 className="text-base font-bold">What&apos;s Covered</h2>
      <div className="mt-3 divide-y divide-stone-100">
        {items.map(([label, status, tone]) => (
          <div key={label} className="flex min-h-12 items-center justify-between gap-3 py-2">
            <div className="flex items-center gap-3">
              <span
                className={`grid h-8 w-8 place-items-center rounded-xl ${
                  tone === "warn"
                    ? "bg-amber-100 text-amber-700"
                    : tone === "neutral"
                      ? "bg-stone-100 text-stone-600"
                      : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {tone === "warn" ? "!" : "✓"}
              </span>
              <p className="text-sm font-bold">{label}</p>
            </div>
            <p className={`text-sm font-semibold ${tone === "warn" ? "text-orange-600" : "text-stone-500"}`}>
              {status}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
