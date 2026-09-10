"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { UiIcon } from "@/components/UiIcon";
import {
  createHouseholdPerson,
  type HouseholdPersonType,
} from "@/lib/household-sharing";

const personTypes: Array<{
  value: Exclude<HouseholdPersonType, "owner">;
  label: string;
}> = [
  { value: "adult", label: "Adult" },
  { value: "teen", label: "Teen" },
  { value: "child", label: "Child" },
  { value: "dependent", label: "Dependant" },
  { value: "trusted_contact", label: "Trusted contact" },
];

export function AddHouseholdPersonForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [personType, setPersonType] =
    useState<Exclude<HouseholdPersonType, "owner">>("adult");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setSaving(true);
    try {
      await createHouseholdPerson({
        firstName,
        lastName,
        preferredName: "",
        relationship,
        personType,
        dateOfBirth: "",
      });
      router.push("/family/household");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This person could not be added.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg pb-24">
      <header className="flex items-center gap-3 py-2">
        <Link
          href="/family/household"
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-ink"
        >
          <UiIcon name="arrow-left" className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Add someone</h1>
      </header>

      <form onSubmit={save} className="mt-5 space-y-4 rounded-[28px] border border-black/5 bg-white p-5 shadow-soft">
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink">First name</span>
            <input
              autoComplete="off"
              maxLength={100}
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="min-h-12 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none focus:border-moss"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink">Last name</span>
            <input
              autoComplete="off"
              maxLength={100}
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="min-h-12 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none focus:border-moss"
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink">Relationship</span>
          <input
            autoComplete="off"
            maxLength={100}
            required
            value={relationship}
            onChange={(event) => setRelationship(event.target.value)}
            className="min-h-12 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none focus:border-moss"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink">Type</span>
          <select
            value={personType}
            onChange={(event) => setPersonType(event.target.value as typeof personType)}
            className="min-h-12 w-full rounded-2xl border border-black/10 bg-white px-4 outline-none focus:border-moss"
          >
            {personTypes.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        {message ? <p role="alert" className="text-sm font-medium text-red-600">{message}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="min-h-12 w-full rounded-2xl bg-ink px-4 font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
