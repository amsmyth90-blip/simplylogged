import type { Metadata } from "next";

import { BottomNav } from "@/components/BottomNav";
import { DocumentDetailWorkspace } from "@/components/DocumentDetailWorkspace";
import { requireUser } from "@/lib/auth";

type DocumentPageProps = {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ from?: string; vehicleId?: string }>;
};

export const metadata: Metadata = { title: "Document" };

const documentReturnTargets: Record<string, { href: string; label: string }> = {
  office: { href: "/room/office", label: "Office" },
  garage: { href: "/room/garage", label: "Garage" },
  bedroom: { href: "/room/bedroom", label: "Bedroom" },
  garden: { href: "/room/garden", label: "Garden" },
  driveway: { href: "/room/driveway", label: "Driveway" }
};

export default async function DocumentPage({ params, searchParams }: DocumentPageProps) {
  await requireUser();

  const [{ documentId }, { from, vehicleId }] = await Promise.all([params, searchParams]);
  const returnTarget =
    from === "vehicle" && vehicleId
      ? { href: `/garage/vehicles/${vehicleId}/documents`, label: "Vehicle Documents" }
      : from
        ? documentReturnTargets[from]
        : undefined;

  return (
    <>
      <DocumentDetailWorkspace
        documentId={documentId}
        backHref={returnTarget?.href ?? "/files"}
        backLabel={returnTarget?.label ?? "All Files"}
      />
      <BottomNav />
    </>
  );
}
