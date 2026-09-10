"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { UiIcon } from "@/components/UiIcon";
import {
  loadHouseholdPeople,
  type HouseholdPerson,
} from "@/lib/household-sharing";

function displayName(person: HouseholdPerson) {
  return person.preferredName
    || [person.firstName, person.lastName].filter(Boolean).join(" ");
}

export function HouseholdPeopleCard({ canManage }: { canManage: boolean }) {
  const [people, setPeople] = useState<HouseholdPerson[]>([]);

  useEffect(() => {
    let active = true;
    void loadHouseholdPeople()
      .then((directory) => {
        if (active) setPeople(directory?.people.filter((person) => !person.linkedUserId) ?? []);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  if (!people.length && !canManage) return null;

  return (
    <section className="estate-sheet p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Other people</h2>
        {canManage ? (
          <Link
            href="/family/new-member"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white"
          >
            <UiIcon name="plus" className="h-4 w-4" /> Add
          </Link>
        ) : null}
      </div>
      {people.length ? (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {people.map((person) => (
            <div
              key={person.id}
              className="flex min-h-20 items-center gap-3 rounded-[22px] border border-white/80 bg-white/72 p-3.5 shadow-sm"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sage/65 text-sm font-bold text-moss">
                {person.firstName[0]?.toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">
                  {displayName(person)}
                </span>
                <span className="mt-0.5 block text-xs text-ink/48">
                  {person.relationship}
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
