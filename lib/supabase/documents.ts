import { getCurrentUserId, getSupabaseClient } from "@/lib/supabase/client";
import { deleteDocumentFile } from "@/lib/supabase/storage";
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
  file_path: string | null;
  summary: string;
  status: "new" | "filed";
  created_at: string;
};

export async function getDocuments() {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase) {
    return getLocalDocuments();
  }

  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Supabase getDocuments failed", error);
    throw error;
  }

  return (data as DocumentRow[]).map(fromRow);
}

export async function getDocumentsByRoom(roomId: string) {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase) {
    return getLocalDocumentsByRoom(roomId);
  }

  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Supabase getDocumentsByRoom failed", error);
    throw error;
  }

  return (data as DocumentRow[]).map(fromRow);
}

export async function saveDocument(document: StoredDocument) {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase) {
    saveLocalDocument(document);
    notifyStorageChanged();
    return;
  }

  if (!userId) {
    throw new Error("Sign in required to save documents.");
  }

  const { error } = await supabase.from("documents").upsert(toRow(document, userId));
  if (error) {
    console.warn("Supabase saveDocument failed", error);
    throw error;
  }
  notifyStorageChanged();
}

export async function updateDocument(document: StoredDocument) {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase) {
    updateLocalDocument(document);
    notifyStorageChanged();
    return;
  }

  if (!userId) {
    throw new Error("Sign in required to update documents.");
  }

  const { error } = await supabase
    .from("documents")
    .update(toRow(document, userId))
    .eq("id", document.id)
    .eq("user_id", userId);

  if (error) {
    console.warn("Supabase updateDocument failed", error);
    throw error;
  }
  notifyStorageChanged();
}

export async function deleteDocument(documentId: string) {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase) {
    deleteLocalDocument(documentId);
    notifyStorageChanged();
    return;
  }

  if (!userId) {
    throw new Error("Sign in required to delete documents.");
  }

  const { data: document, error: lookupError } = await supabase
    .from("documents")
    .select("file_path")
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) {
    console.warn("Supabase deleteDocument lookup failed", lookupError);
  }

  const filePath = typeof document?.file_path === "string" ? document.file_path : "";

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("user_id", userId);

  if (error) {
    console.warn("Supabase deleteDocument failed", error);
    throw error;
  }

  if (!error && filePath) {
    try {
      await deleteDocumentFile(filePath);
    } catch (storageError) {
      console.warn("Supabase deleteDocumentFile failed", storageError);
    }
  }
  notifyStorageChanged();
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
    fileUrl: "",
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
    file_path: document.filePath || null,
    summary: document.summary,
    status: document.status,
    created_at: document.uploadedAt,
  };
}

function notifyStorageChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("simplyLoggedStorage"));
  }
}
