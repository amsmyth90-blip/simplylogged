export type StoredDocument = {
  id: string;
  userId?: string;
  title: string;
  roomId: string;
  roomName: string;
  category: string;
  provider: string;
  policyNumber?: string;
  issueDate?: string;
  expiryDate: string;
  fileUrl?: string;
  filePath?: string;
  uploadedAt: string;
  status: "new" | "filed";
  summary: string;
};

export type StoredReminder = {
  id: string;
  userId?: string;
  title: string;
  roomId: string;
  roomName: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
  linkedDocumentId: string;
  completed: boolean;
  createdAt?: string;
};

const documentsKey = "simplyLoggedDocuments";
const remindersKey = "simplyLoggedReminders";

export function getDocuments(): StoredDocument[] {
  return read<StoredDocument[]>(documentsKey, []);
}

export function saveDocument(document: StoredDocument) {
  const documents = getDocuments();
  write(documentsKey, [document, ...documents.filter((item) => item.id !== document.id)]);
}

export function getReminders(): StoredReminder[] {
  return read<StoredReminder[]>(remindersKey, []);
}

export function saveReminder(reminder: StoredReminder) {
  const reminders = getReminders();
  write(remindersKey, [reminder, ...reminders.filter((item) => item.id !== reminder.id)]);
}

export function getDocumentsByRoom(roomId: string) {
  return getDocuments().filter((document) => document.roomId === roomId);
}

export function getRemindersByRoom(roomId: string) {
  return getReminders().filter((reminder) => reminder.roomId === roomId);
}

export function updateReminder(reminder: StoredReminder) {
  saveReminder(reminder);
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("simplyLoggedStorage"));
}
