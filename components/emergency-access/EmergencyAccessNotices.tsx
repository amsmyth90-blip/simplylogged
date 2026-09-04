import type { EmergencyAccessController } from "./useEmergencyAccess";

export function EmergencyAccessNotices({
  access,
}: {
  access: EmergencyAccessController;
}) {
  if (!access.notices.length) return null;
  return (
    <section className="estate-sheet p-5">
      <h2 className="font-serif text-xl">Recent access changes</h2>
      <div className="mt-3 space-y-2">
        {access.notices.slice(0, 8).map((notice) => (
          <div
            key={notice.id}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="font-semibold text-[#33423a]">
              {notice.event_type.replaceAll("_", " ").toLowerCase()}{" "}
              {notice.label ? `· ${notice.label}` : ""}
            </span>
            <time className="shrink-0 text-[#667068]">
              {new Intl.DateTimeFormat("en-GB", {
                dateStyle: "medium",
              }).format(new Date(notice.created_at))}
            </time>
          </div>
        ))}
      </div>
    </section>
  );
}
