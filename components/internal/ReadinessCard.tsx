export function ReadinessCard({
  label = "Room Readiness",
  score,
}: {
  label?: string;
  score: number;
}) {
  const needsAttention = score < 80;

  return (
    <section className="rounded-[1.35rem] bg-white p-4 shadow-xl shadow-stone-300/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-stone-500">{label}</p>
          <h2 className={`mt-1 text-3xl font-bold ${needsAttention ? "text-orange-500" : "text-emerald-700"}`}>
            {score}%
          </h2>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            needsAttention ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {needsAttention ? "Needs Attention" : "On Track"}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div
          className={`h-full rounded-full ${needsAttention ? "bg-orange-400" : "bg-emerald-600"}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </section>
  );
}
