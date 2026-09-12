import { type NextRequest } from "next/server";
import { createContentSecurityPolicy } from "@/lib/http/content-security-policy";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64");
  const policy = createContentSecurityPolicy(
    nonce,
    process.env.NODE_ENV === "development",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", policy);
  const response = await updateSession(request);
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
