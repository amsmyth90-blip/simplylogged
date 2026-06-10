import { getCurrentUserId, getSupabaseClient } from "@/lib/supabase/client";
import {
  deleteFamilyMember as deleteLocalFamilyMember,
  getFamilyMembers as getLocalFamilyMembers,
  saveFamilyMember as saveLocalFamilyMember,
  type StoredFamilyMember,
} from "@/lib/storage";

type FamilyMemberRow = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
};

export async function getFamilyMembers() {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    return getLocalFamilyMembers();
  }

  const { data, error } = await supabase
    .from("family_members")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Supabase getFamilyMembers failed", error);
    return getLocalFamilyMembers();
  }

  return (data as FamilyMemberRow[]).map(fromRow);
}

export async function saveFamilyMember(member: StoredFamilyMember) {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    saveLocalFamilyMember(member);
    notifyStorageChanged();
    return;
  }

  const { error } = await supabase.from("family_members").upsert(toRow(member, userId));
  if (error) {
    console.warn("Supabase saveFamilyMember failed", error);
    saveLocalFamilyMember(member);
  }
  notifyStorageChanged();
}

export async function deleteFamilyMember(memberId: string) {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    deleteLocalFamilyMember(memberId);
    notifyStorageChanged();
    return;
  }

  const { error } = await supabase
    .from("family_members")
    .delete()
    .eq("id", memberId)
    .eq("user_id", userId);

  if (error) {
    console.warn("Supabase deleteFamilyMember failed", error);
    deleteLocalFamilyMember(memberId);
  }
  notifyStorageChanged();
}

function fromRow(row: FamilyMemberRow): StoredFamilyMember {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    access: toAccess(row.role),
    createdAt: row.created_at,
  };
}

function toRow(member: StoredFamilyMember, userId: string) {
  return {
    id: member.id,
    user_id: userId,
    name: member.name,
    email: member.email,
    role: member.access,
    created_at: member.createdAt,
  };
}

function toAccess(role: string): StoredFamilyMember["access"] {
  if (role === "Owner" || role === "Admin" || role === "Member" || role === "Viewer") {
    return role;
  }

  if (role.toLowerCase() === "admin") return "Admin";
  if (role.toLowerCase() === "member") return "Member";
  return "Viewer";
}

function notifyStorageChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("simplyLoggedStorage"));
  }
}
