import { useEffect, useState } from "react";

import type {
  HouseholdPeopleDirectory,
  HouseholdPersonType,
} from "@diarydock/household";

import {
  createMobileHouseholdPerson,
  loadMobileHouseholdPeople,
} from "./household-client";

const types: Array<{
  value: Exclude<HouseholdPersonType, "owner">;
  label: string;
}> = [
  { value: "adult", label: "Adult" },
  { value: "teen", label: "Teen" },
  { value: "child", label: "Child" },
  { value: "dependent", label: "Dependant" },
  { value: "trusted_contact", label: "Trusted contact" },
];

export function HouseholdPeople(props: {
  accessToken: string;
  canManage: boolean;
}) {
  const [directory, setDirectory] = useState<HouseholdPeopleDirectory | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [personType, setPersonType] =
    useState<Exclude<HouseholdPersonType, "owner">>("adult");

  useEffect(() => {
    let active = true;
    void loadMobileHouseholdPeople(props.accessToken)
      .then((result) => { if (active) setDirectory(result); })
      .catch(() => { if (active) setMessage("People could not be loaded."); });
    return () => { active = false; };
  }, [props.accessToken]);

  const people = directory?.people.filter((person) => !person.linkedUserId) ?? [];

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await createMobileHouseholdPerson(props.accessToken, {
        firstName,
        lastName,
        preferredName: "",
        relationship,
        personType,
        dateOfBirth: "",
      });
      setDirectory(result);
      setFirstName("");
      setLastName("");
      setRelationship("");
      setPersonType("adult");
      setAdding(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This person could not be added.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="family-card">
      <div className="family-section-title">
        <h2>People</h2>
        {props.canManage ? (
          <button type="button" onClick={() => setAdding((value) => !value)}>
            {adding ? "Cancel" : "Add someone"}
          </button>
        ) : null}
      </div>

      {adding ? (
        <form className="family-person-form" onSubmit={save}>
          <label>First name<input required maxLength={100} autoComplete="off"
            value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
          <label>Last name<input maxLength={100} autoComplete="off"
            value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
          <label>Relationship<input required maxLength={100} autoComplete="off"
            value={relationship} onChange={(event) => setRelationship(event.target.value)} /></label>
          <label>Type<select value={personType}
            onChange={(event) => setPersonType(event.target.value as typeof personType)}>
            {types.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select></label>
          <button className="family-primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </form>
      ) : null}

      {people.length ? (
        <div className="family-member-list">
          {people.map((person) => {
            const name = person.preferredName
              || [person.firstName, person.lastName].filter(Boolean).join(" ");
            return (
              <article className="family-member" key={person.id}>
                <span className="family-avatar">{name.slice(0, 2).toUpperCase()}</span>
                <div><strong>{name}</strong><span>{person.relationship}</span></div>
              </article>
            );
          })}
        </div>
      ) : null}
      {message ? <p className="form-message" role="status">{message}</p> : null}
    </section>
  );
}
