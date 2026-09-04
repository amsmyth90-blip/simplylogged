"use client";

import Link from "next/link";

import { AddTrustedPerson } from "@/components/emergency-access/AddTrustedPerson";
import { EmergencyAccessIntro } from "@/components/emergency-access/EmergencyAccessIntro";
import { EmergencyAccessNotices } from "@/components/emergency-access/EmergencyAccessNotices";
import { EmergencyResourceGrants } from "@/components/emergency-access/EmergencyResourceGrants";
import { TrustedPeople } from "@/components/emergency-access/TrustedPeople";
import { useEmergencyAccess } from "@/components/emergency-access/useEmergencyAccess";
import { PageHeader } from "@/components/PageHeader";

export function EmergencyAccessWorkspace() {
  const access = useEmergencyAccess();
  return (
    <div className="space-y-5 pb-28">
      <PageHeader
        eyebrow="Trusted access"
        title="Emergency sharing"
        subtitle="Choose a trusted person, then select only the individual emergency items they may open. This is separate from household sharing."
        backHref="/emergency"
        backLabel="Emergency"
        action={
          <Link
            href="/emergency/shared"
            className="inline-flex min-h-11 items-center rounded-full border border-[#315443]/10 bg-white px-3 text-xs font-semibold text-[#52705a]"
          >
            Received access
          </Link>
        }
        meta={
          <>
            <span className="estate-chip">Nothing shared by default</span>
            <span className="estate-chip">Revocable</span>
          </>
        }
      />
      <EmergencyAccessIntro access={access} />
      <AddTrustedPerson access={access} />
      <TrustedPeople access={access} />
      <EmergencyResourceGrants access={access} />
      <EmergencyAccessNotices access={access} />
      <p className="text-xs leading-5 text-[#667068]">
        DiaryDock does not automatically release information after inactivity or
        death. Any future delayed-access feature requires separate approval and
        design.
      </p>
    </div>
  );
}
