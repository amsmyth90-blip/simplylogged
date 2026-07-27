import type { Metadata } from "next";

import { InviteAcceptanceWorkspace } from "@/components/InviteAcceptanceWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Family Invite" };

type InvitePageProps = {
  params: Promise<{ inviteId: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  await requireUser();
  const { inviteId } = await params;

  return <InviteAcceptanceWorkspace inviteId={inviteId} />;
}
