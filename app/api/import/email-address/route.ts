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
  const providerReady = process.env.DIARYDOCK_INBOUND_EMAIL_PROVIDER_READY === "true";

  if (!secret || !providerReady) {
    return NextResponse.json({
      configured: false,
      message: "Email forwarding is built into the app. The final mail-provider connection still needs to be switched on before forwarding is active."
    });
  }

  return NextResponse.json({
    configured: true,
    address: createInboundEmailAddress(user.id, secret)
  });
}
