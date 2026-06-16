"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Crown, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { InternalPageShell } from "@/components/InternalPageShell";
import { Toast } from "@/components/Toast";
import { confirmDelete } from "@/lib/confirmations";
import { deleteFamilyMember, getFamilyMembers, saveFamilyMember } from "@/lib/supabase/family";
import type { StoredFamilyMember } from "@/lib/storage";

const activity = [
  "Amy uploaded Home Insurance",
  "James completed MOT reminder",
  "Emily added Passport",
];

const defaultMembers: StoredFamilyMember[] = [
  { id: "default-owner", name: "Amy Smith", email: "amy@example.com", role: "You", access: "Owner", createdAt: "2026-01-01T00:00:00.000Z" },
];

export default function FamilyPage() {
  const [members, setMembers] = useState<StoredFamilyMember[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Family member");
  const [access, setAccess] = useState<StoredFamilyMember["access"]>("Member");
  const [toast, setToast] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState("");

  async function refresh() {
    setMembers(await getFamilyMembers());
  }

  useEffect(() => {
    queueMicrotask(refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("simplyLoggedStorage", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("simplyLoggedStorage", refresh);
    };
  }, []);

  const visibleMembers = members.length ? members : defaultMembers;
  const hasSavedMembers = members.length > 0;

  const memberCountLabel = useMemo(
    () => `${visibleMembers.length} ${visibleMembers.length === 1 ? "member" : "members"}`,
    [visibleMembers.length],
  );

  async function inviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setIsInviting(true);
      await saveFamilyMember({
        id: createId(),
        name: name.trim(),
        email: email.trim(),
        role: role.trim(),
        access,
        createdAt: new Date().toISOString(),
      });
      setName("");
      setEmail("");
      setRole("Family member");
      setAccess("Member");
      setShowInvite(false);
      await refresh();
      setToast("Invite saved.");
    } catch {
      setToast("Could not save invite. Please try again.");
    } finally {
      setIsInviting(false);
    }
  }

  async function changeAccess(member: StoredFamilyMember, nextAccess: StoredFamilyMember["access"]) {
    if (member.id.startsWith("default-")) return;
    try {
      setBusyMemberId(member.id);
      await saveFamilyMember({ ...member, access: nextAccess });
      await refresh();
      setToast("Permissions updated.");
    } catch {
      setToast("Could not update permissions. Please try again.");
    } finally {
      setBusyMemberId("");
    }
  }

  async function removeMember(member: StoredFamilyMember) {
    if (member.id.startsWith("default-")) return;
    if (!confirmDelete(member.name)) return;
    try {
      setBusyMemberId(member.id);
      await deleteFamilyMember(member.id);
      await refresh();
      setToast("Family member removed.");
    } catch {
      setToast("Could not remove family member. Please try again.");
    } finally {
      setBusyMemberId("");
    }
  }

  return (
    <InternalPageShell
      icon={Users}
      eyebrow="Command centre"
      title="Family"
      subtitle={`${memberCountLabel} connected to the estate, with access and activity in one place.`}
      action={
        <button
            onClick={() => setShowInvite((current) => !current)}
            className="grid h-11 w-11 place-items-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-300"
            aria-label="Invite family"
          >
            <UserPlus className="h-5 w-5" />
          </button>
      }
    >
        {showInvite ? (
          <form onSubmit={inviteMember} className="mb-4 grid gap-2 rounded-[1.35rem] bg-white p-4 shadow-xl shadow-stone-300/50">
            <h2 className="font-bold">Invite family member</h2>
            <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Name" className="min-h-12 rounded-2xl bg-[#fbf7ef] px-4 text-sm font-bold outline-none" />
            <input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" placeholder="Email" className="min-h-12 rounded-2xl bg-[#fbf7ef] px-4 text-sm font-bold outline-none" />
            <input value={role} onChange={(event) => setRole(event.target.value)} required placeholder="Role" className="min-h-12 rounded-2xl bg-[#fbf7ef] px-4 text-sm font-bold outline-none" />
            <select value={access} onChange={(event) => setAccess(event.target.value as StoredFamilyMember["access"])} className="min-h-12 rounded-2xl bg-[#fbf7ef] px-4 text-sm font-bold outline-none">
              <option value="Admin">Admin</option>
              <option value="Member">Member</option>
              <option value="Viewer">Viewer</option>
            </select>
            <button
              disabled={isInviting}
              className="min-h-12 rounded-full bg-stone-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {isInviting ? "Saving..." : "Save invite"}
            </button>
          </form>
        ) : null}

        <section className="rounded-[1.35rem] bg-white p-4 shadow-xl shadow-stone-300/50">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Family Members</h2>
            <button onClick={() => setShowInvite(true)} className="min-h-11 rounded-full px-3 text-sm font-bold text-violet-700">+ Invite</button>
          </div>
          <div className="space-y-3">
            {visibleMembers.map((person) => (
              <article key={person.id} className="flex min-h-16 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`grid h-11 w-11 place-items-center rounded-full ${avatarTone(person.access)} text-white`}>
                    {person.access === "Owner" ? <Crown className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold">{person.name}</h3>
                    <p className="truncate text-sm text-stone-500">{person.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={person.access}
                    onChange={(event) => changeAccess(person, event.target.value as StoredFamilyMember["access"])}
                    disabled={person.access === "Owner" || person.id.startsWith("default-") || busyMemberId === person.id}
                    className="min-h-11 rounded-full bg-violet-50 px-3 text-sm font-bold text-violet-700 outline-none disabled:opacity-80"
                  >
                    <option value="Owner">Owner</option>
                    <option value="Admin">Admin</option>
                    <option value="Member">Member</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                  {person.access !== "Owner" && !person.id.startsWith("default-") ? (
                    <button disabled={busyMemberId === person.id} onClick={() => removeMember(person)} className="grid h-11 w-11 place-items-center rounded-full bg-rose-50 text-rose-700 disabled:opacity-50" aria-label={`Remove ${person.name}`}>
                      <Trash2 className="h-5 w-5" />
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          {!hasSavedMembers ? (
            <p className="mt-3 rounded-2xl bg-[#fbf7ef] p-3 text-sm font-semibold text-stone-500">
              Local family sharing is ready. Invite someone to store your first mock family member.
            </p>
          ) : null}
        </section>

        <section className="mt-4 rounded-[1.35rem] bg-white p-4 shadow-sm shadow-stone-200">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5 text-amber-700" />
            <h2 className="font-bold">Recent Activity</h2>
          </div>
          <div className="space-y-3">
            {activity.map((item, index) => (
              <div key={item} className="flex min-h-12 items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-amber-100 text-amber-700">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item}</p>
                  <p className="text-sm text-stone-500">{index + 1}d ago</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      <Toast message={toast} tone={toast.startsWith("Could") ? "error" : "success"} />
    </InternalPageShell>
  );
}

function avatarTone(access: StoredFamilyMember["access"]) {
  if (access === "Admin") return "bg-amber-600";
  if (access === "Member") return "bg-emerald-600";
  if (access === "Viewer") return "bg-stone-600";
  return "bg-violet-600";
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `family-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
