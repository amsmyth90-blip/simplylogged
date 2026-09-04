import "server-only";

import { authenticateHybridRequest } from "@/lib/supabase/hybrid-request";

export async function authenticateDocumentUploadRequest(request: Request) {
  const auth = await authenticateHybridRequest(request);
  return auth.error ? { error: auth.error, user: null } : { error: null, user: auth.user };
}
