import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { createInboundEmailAddress, getInboundEmailSecret } from "@/lib/inbound-email";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  const secret = getInboundEmailSecret();

  if (!secret) {
    return NextResponse.json({
      configured: false,
      message: "Email forwarding is ready in the app, but the inbound email secret still needs to be added in production."
    });
  }

  return NextResponse.json({
    configured: true,
    address: createInboundEmailAddress(user.id, secret)
  });
}
