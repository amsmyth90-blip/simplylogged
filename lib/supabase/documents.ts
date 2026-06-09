import { getCurrentUserId, getSupabaseClient } from "@/lib/supabase/client";
import {
  getDocuments as getLocalDocuments,
  getDocumentsByRoom as getLocalDocumentsByRoom,
  saveDocument as saveLocalDocument,
  updateDocument as updateLocalDocument,
  deleteDocument as deleteLocalDocument,
  type StoredDocument,
} from "@/lib/storage";

type DocumentRow = {
  id: string;
  user_id: string;
  title: string;
  room_id: string;
  room_name: string;
  category: string;
  provider: string;
  policy_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  file_url: string | null;
  file_path: string | null;
  summary: string;
  status: "new" | "filed";
  created_at: string;
};

export async function getDocuments() {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    return getLocalDocuments();
  }

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase getDocuments failed", error);
    return getLocalDocuments();
  }

  return (data as DocumentRow[]).map(fromRow);
}

export async function getDocumentsByRoom(roomId: string) {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    return getLocalDocumentsByRoom(roomId);
  }

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase getDocumentsByRoom failed", error);
    return getLocalDocumentsByRoom(roomId);
  }

  return (data as DocumentRow[]).map(fromRow);
}

export async function saveDocument(document: StoredDocument) {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    saveLocalDocument(document);
    return;
  }

  const { error } = await supabase.from("documents").upsert(toRow(document, userId));
  if (error) {
    console.error("Supabase saveDocument failed", error);
    saveLocalDocument(document);
  }
}

export async function updateDocument(document: StoredDocument) {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    updateLocalDocument(document);
    return;
  }

  const { error } = await supabase
    .from("documents")
    .update(toRow(document, userId))
    .eq("id", document.id)
    .eq("user_id", userId);

  if (error) {
    console.error("Supabase updateDocument failed", error);
    updateLocalDocument(document);
  }
}

export async function deleteDocument(documentId: string) {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    deleteLocalDocument(documentId);
    return;
  }

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("user_id", userId);

  if (error) {
    console.error("Supabase deleteDocument failed", error);
    deleteLocalDocument(documentId);
  }
}

function fromRow(row: DocumentRow): StoredDocument {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    roomId: row.room_id,
    roomName: row.room_name,
    category: row.category,
    provider: row.provider,
    policyNumber: row.policy_number ?? "",
    issueDate: row.issue_date ?? "",
    expiryDate: row.expiry_date ?? "",
    fileUrl: row.file_url ?? "",
    filePath: row.file_path ?? "",
    uploadedAt: row.created_at,
    status: row.status,
    summary: row.summary,
  };
}

function toRow(document: StoredDocument, userId: string) {
  return {
    id: document.id,
    user_id: userId,
    title: document.title,
    room_id: document.roomId,
    room_name: document.roomName,
    category: document.category,
    provider: document.provider,
    policy_number: document.policyNumber || null,
    issue_date: document.issueDate || null,
    expiry_date: document.expiryDate || null,
    file_url: document.fileUrl || null,
    file_path: document.filePath || null,
    summary: document.summary,
    status: document.status,
    created_at: document.uploadedAt,
  };
}
