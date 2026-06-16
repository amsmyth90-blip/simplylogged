import { getCurrentUserId, getSupabaseClient } from "@/lib/supabase/client";
import {
  getReminders as getLocalReminders,
  getRemindersByRoom as getLocalRemindersByRoom,
  saveReminder as saveLocalReminder,
  updateReminder as updateLocalReminder,
  deleteReminder as deleteLocalReminder,
  type StoredReminder,
} from "@/lib/storage";

type ReminderRow = {
  id: string;
  user_id: string;
  document_id: string | null;
  room_id: string;
  room_name: string;
  title: string;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  completed: boolean;
  created_at: string;
};

export async function getReminders() {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase) {
    return getLocalReminders();
  }

  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_id", userId)
    .order("due_date", { ascending: true });

  if (error) {
    console.warn("Supabase getReminders failed", error);
    throw error;
  }

  return (data as ReminderRow[]).map(fromRow);
}

export async function getRemindersByRoom(roomId: string) {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase) {
    return getLocalRemindersByRoom(roomId);
  }

  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("user_id", userId)
    .eq("room_id", roomId)
    .order("due_date", { ascending: true });

  if (error) {
    console.warn("Supabase getRemindersByRoom failed", error);
    throw error;
  }

  return (data as ReminderRow[]).map(fromRow);
}

export async function saveReminder(reminder: StoredReminder) {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase) {
    saveLocalReminder(reminder);
    notifyStorageChanged();
    return;
  }

  if (!userId) {
    throw new Error("Sign in required to save reminders.");
  }

  const { error } = await supabase.from("reminders").upsert(toRow(reminder, userId));
  if (error) {
    console.warn("Supabase saveReminder failed", error);
    throw error;
  }
  notifyStorageChanged();
}

export async function updateReminder(reminder: StoredReminder) {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase) {
    updateLocalReminder(reminder);
    notifyStorageChanged();
    return;
  }

  if (!userId) {
    throw new Error("Sign in required to update reminders.");
  }

  const { error } = await supabase
    .from("reminders")
    .update(toRow(reminder, userId))
    .eq("id", reminder.id)
    .eq("user_id", userId);

  if (error) {
    console.warn("Supabase updateReminder failed", error);
    throw error;
  }
  notifyStorageChanged();
}

export async function deleteReminder(reminderId: string) {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase) {
    deleteLocalReminder(reminderId);
    notifyStorageChanged();
    return;
  }

  if (!userId) {
    throw new Error("Sign in required to delete reminders.");
  }

  const { error } = await supabase
    .from("reminders")
    .delete()
    .eq("id", reminderId)
    .eq("user_id", userId);

  if (error) {
    console.warn("Supabase deleteReminder failed", error);
    throw error;
  }
  notifyStorageChanged();
}

function fromRow(row: ReminderRow): StoredReminder {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    roomId: row.room_id,
    roomName: row.room_name,
    dueDate: row.due_date ?? "",
    priority: row.priority,
    linkedDocumentId: row.document_id ?? "",
    completed: row.completed,
    createdAt: row.created_at,
  };
}

function toRow(reminder: StoredReminder, userId: string) {
  return {
    id: reminder.id,
    user_id: userId,
    document_id: reminder.linkedDocumentId || null,
    room_id: reminder.roomId,
    room_name: reminder.roomName,
    title: reminder.title,
    due_date: reminder.dueDate || null,
    priority: reminder.priority,
    completed: reminder.completed,
    created_at: reminder.createdAt ?? new Date().toISOString(),
  };
}

function notifyStorageChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("simplyLoggedStorage"));
  }
}
