import type { Metadata } from "next";

import { EmergencyInviteWorkspace } from "@/components/EmergencyInviteWorkspace";
import { getAuthenticatedUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Trusted Emergency Invitation", robots: { index: false, follow: false } };

export default async function EmergencyInvitePage({ params }: { params: Promise<{ publicId: string; secret: string }> }) {
  const { publicId, secret } = await params;
  const user = await getAuthenticatedUser();
  return <EmergencyInviteWorkspace publicId={publicId} secret={secret} signedIn={Boolean(user)} />;
}
