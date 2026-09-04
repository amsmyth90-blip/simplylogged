import type { EmergencyAccessController } from "./useEmergencyAccess";

export function TrustedPeople({
  access,
}: {
  access: EmergencyAccessController;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Trusted people</h2>
          <p className="mt-1 text-sm text-[#667068]">
            Pending people have no access until they accept.
          </p>
        </div>
        {access.loading ? (
          <span className="text-xs text-[#667068]">Loading…</span>
        ) : null}
      </div>
      {access.contacts.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {access.contacts.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => access.setSelectedContactId(contact.id)}
              className={`rounded-[20px] border p-4 text-left ${access.selectedContactId === contact.id ? "border-[#6f8e72] bg-[#eef2e9]" : "border-white/80 bg-white/80"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{contact.name}</p>
                  <p className="mt-1 text-xs text-[#667068]">
                    {contact.email} · {contact.relation || "Trusted person"}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold tracking-[0.12em] text-[#52705a]">
                  {contact.status}
                </span>
              </div>
              <p className="mt-3 text-xs text-[#667068]">
                {
                  contact.emergency_access_grants.filter(
                    (grant) => !grant.revoked_at,
                  ).length
                }{" "}
                selected item(s)
              </p>
              {contact.status !== "REVOKED" ? (
                <span
                  role="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (
                      window.confirm(
                        `Remove all emergency access for ${contact.name}?`,
                      )
                    ) {
                      void access.request({
                        operation: "REVOKE_CONTACT",
                        contactId: contact.id,
                      });
                    }
                  }}
                  className="mt-3 inline-flex min-h-10 items-center text-xs font-semibold text-red-600"
                >
                  Revoke all access
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="estate-sheet p-5 text-sm text-[#667068]">
          No trusted people have been added.
        </div>
      )}
    </section>
  );
}
