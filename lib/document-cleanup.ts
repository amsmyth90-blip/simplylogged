import "server-only";

import { DOCUMENT_BUCKET } from "@/lib/document-rules";
import { isOwnedDocumentStoragePath } from "@/lib/document-upload";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type CleanupJob = {
  attempts: number;
  document_id: string;
  id: string;
  owner_id: string;
  storage_bucket: string;
  storage_path: string;
};

function nextAttempt(attempts: number) {
  const minutes = Math.min(24 * 60, 2 ** Math.min(attempts, 10));
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

async function defer(job: CleanupJob) {
  const attempts = Math.min(100, job.attempts + 1);
  await getSupabaseAdminClient().from("document_storage_cleanup_jobs").update({
    attempts,
    next_attempt_at: nextAttempt(attempts),
  }).eq("id", job.id).eq("owner_id", job.owner_id);
}

export async function processDocumentStorageCleanup(limit = 50) {
  const admin = getSupabaseAdminClient();
  const pending = await admin.from("document_storage_cleanup_jobs")
    .select("id,owner_id,document_id,storage_bucket,storage_path,attempts")
    .lte("next_attempt_at", new Date().toISOString())
    .lt("attempts", 100)
    .order("next_attempt_at", { ascending: true })
    .limit(Math.max(1, Math.min(100, limit)))
    .returns<CleanupJob[]>();
  if (pending.error) throw new Error("Document cleanup could not be loaded.");

  let completed = 0;
  let deferred = 0;
  for (const job of pending.data ?? []) {
    if (job.storage_bucket !== DOCUMENT_BUCKET
      || !isOwnedDocumentStoragePath(job.owner_id, job.document_id, job.storage_path)) {
      await defer({ ...job, attempts: 99 });
      deferred += 1;
      continue;
    }
    const removal = await admin.storage.from(job.storage_bucket).remove([job.storage_path]);
    if (removal.error) {
      await defer(job);
      deferred += 1;
      continue;
    }
    const deletion = await admin.from("document_storage_cleanup_jobs")
      .delete().eq("id", job.id).eq("owner_id", job.owner_id);
    if (deletion.error) throw new Error("Document cleanup could not be completed.");
    completed += 1;
  }
  return { completed, deferred, inspected: pending.data?.length ?? 0 };
}
