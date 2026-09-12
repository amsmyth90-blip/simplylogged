import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { PasswordVaultWorkspace } from "@/components/password-vault/PasswordVaultWorkspace";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Password Vault" };

export default async function PasswordVaultPage() {
  const user = await requireUser();
  return <><PasswordVaultWorkspace accountId={user.id} /><BottomNav /></>;
}
