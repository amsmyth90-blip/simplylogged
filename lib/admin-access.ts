import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";

function parseAdminEmails(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function requireAccountDeletionAdmin() {
  const user = await requireUser();
  const adminEmails = parseAdminEmails(process.env.ACCOUNT_DELETION_ADMIN_EMAILS);
  const email = user.email?.trim().toLowerCase();

  if (!email || !adminEmails.has(email)) {
    notFound();
  }

  return user;
}
