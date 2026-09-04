import { UiIcon } from "@/components/UiIcon";

import type { EmergencyAccessController } from "./useEmergencyAccess";

export function EmergencyResourceGrants({
  access,
}: {
  access: EmergencyAccessController;
}) {
  if (!access.selected || access.selected.status === "REVOKED") return null;
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-serif text-2xl">
          Items for {access.selected.name}
        </h2>
        <p className="mt-1 text-sm text-[#667068]">
          Select items one at a time. Document choices are limited to records
          already marked for emergency use.
        </p>
      </div>
      <div className="estate-sheet divide-y divide-white/70 overflow-hidden">
        {access.resources.length ? (
          access.resources.map((resource) => {
            const granted = access.activeKeys.has(
              `${resource.type}:${resource.id}`,
            );
            return (
              <div
                key={`${resource.type}:${resource.id}`}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2e9] text-[#52705a]">
                  <UiIcon
                    name={
                      resource.type === "CONTACT"
                        ? "phone"
                        : resource.type === "DOCUMENT"
                          ? "file"
                          : "shield"
                    }
                    className="h-4 w-4"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {resource.label}
                  </span>
                  <span className="block truncate text-xs text-[#667068]">
                    {resource.detail || resource.type.replace("_", " ")}
                  </span>
                </span>
                <button
                  disabled={access.busy}
                  onClick={() =>
                    void access.request({
                      operation: granted ? "REVOKE_GRANT" : "GRANT",
                      contactId: access.selected?.id,
                      resourceType: resource.type,
                      resourceId: resource.id,
                    })
                  }
                  className={`min-h-10 rounded-xl px-3 text-xs font-semibold ${granted ? "bg-red-50 text-red-600" : "bg-[#315443] text-white"}`}
                >
                  {granted ? "Remove" : "Allow"}
                </button>
              </div>
            );
          })
        ) : (
          <p className="p-5 text-sm text-[#667068]">
            Add emergency contacts, plans or home information—or mark a document
            for emergency use—to make it selectable here.
          </p>
        )}
      </div>
    </section>
  );
}
