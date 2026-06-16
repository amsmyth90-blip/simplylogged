export type StoredDocument = {
  id: string;
  userId?: string;
  title: string;
  roomId: string;
  roomName: string;
  category: string;
  provider: string;
  documentType?: string;
  policyNumber?: string;
  issueDate?: string;
  expiryDate: string;
  fileUrl?: string;
  filePath?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  analysisSource?: "openai" | "mock" | "manual";
  analysisConfidence?: number;
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

export type StoredFamilyMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  access: "Owner" | "Admin" | "Member" | "Viewer";
  createdAt: string;
};

const documentsKey = "simplyLoggedDocuments";
const remindersKey = "simplyLoggedReminders";
const familyMembersKey = "simplyLoggedFamilyMembers";

export function getDocuments(): StoredDocument[] {
  return read<StoredDocument[]>(documentsKey, []);
}

export function saveDocument(document: StoredDocument) {
  const documents = getDocuments();
  write(documentsKey, [document, ...documents.filter((item) => item.id !== document.id)]);
}

export function updateDocument(document: StoredDocument) {
  saveDocument(document);
}

export function deleteDocument(documentId: string) {
  write(
    documentsKey,
    getDocuments().filter((document) => document.id !== documentId),
  );
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

export function deleteReminder(reminderId: string) {
  write(
    remindersKey,
    getReminders().filter((reminder) => reminder.id !== reminderId),
  );
}

export function getFamilyMembers(): StoredFamilyMember[] {
  return read<StoredFamilyMember[]>(familyMembersKey, []);
}

export function saveFamilyMember(member: StoredFamilyMember) {
  const members = getFamilyMembers();
  write(familyMembersKey, [member, ...members.filter((item) => item.id !== member.id)]);
}

export function deleteFamilyMember(memberId: string) {
  write(
    familyMembersKey,
    getFamilyMembers().filter((member) => member.id !== memberId),
  );
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
