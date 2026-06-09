import { documentsBucket, getCurrentUserId, getSupabaseClient } from "@/lib/supabase/client";

export type UploadedDocumentFile = {
  documentId: string;
  filePath: string;
  fileUrl: string;
};

export async function uploadDocumentFile(file: File, documentId: string) {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    return null;
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const filePath = `${userId}/${documentId}/${safeName}`;
  const { error } = await supabase.storage
    .from(documentsBucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (error) {
    throw error;
  }

  const { data } = await supabase.storage
    .from(documentsBucket)
    .createSignedUrl(filePath, 60 * 60);

  return {
    documentId,
    filePath,
    fileUrl: data?.signedUrl ?? "",
  } satisfies UploadedDocumentFile;
}
