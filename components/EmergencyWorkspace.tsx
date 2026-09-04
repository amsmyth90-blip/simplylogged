"use client";

import Link from "next/link";
import { useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { PageHeader } from "@/components/PageHeader";
import { EmergencyContent } from "@/components/emergency/EmergencyContent";
import { EmergencyEditorModal } from "@/components/emergency/EmergencyEditorModal";
import {
  defaultEmergencyContact,
  defaultEmergencyNote,
  defaultEmergencyPlan,
  emergencyInitials,
  type EmergencyModalMode,
} from "@/components/emergency/emergency-model";

type EmergencyWorkspaceProps = {
  initialContacts: unknown;
  initialPlans: unknown;
  initialHomeInfo: unknown;
};

export function EmergencyWorkspace(props: EmergencyWorkspaceProps) {
  void props;
  const { state, repositoryMode, updateState } = useDiaryDockData();
  const [modal, setModal] = useState<EmergencyModalMode>(null);
  const [contactDraft, setContactDraft] = useState(defaultEmergencyContact);
  const [planDraft, setPlanDraft] = useState(defaultEmergencyPlan);
  const [noteDraft, setNoteDraft] = useState(defaultEmergencyNote);

  const closeModal = () => {
    setModal(null);
    setContactDraft(defaultEmergencyContact);
    setPlanDraft(defaultEmergencyPlan);
    setNoteDraft(defaultEmergencyNote);
  };

  const saveContact = () => {
    const name = contactDraft.name.trim();
    const relation = contactDraft.relation.trim();
    const phone = contactDraft.phone.trim();
    if (!name || !relation || !phone) return;
    updateState((current) => ({
      ...current,
      emergencyContacts: [
        ...current.emergencyContacts,
        {
          id: `ec-${Date.now()}`,
          name,
          relation,
          phone,
          note: contactDraft.note.trim() || undefined,
        },
      ],
      careContacts: [
        ...current.careContacts,
        {
          id: `care-${Date.now()}`,
          name,
          relation,
          detail: contactDraft.note.trim() || "Added from Emergency",
          phone,
          initials: emergencyInitials(name),
        },
      ],
    }));
    closeModal();
  };

  const savePlan = () => {
    const title = planDraft.title.trim();
    const summary = planDraft.summary.trim();
    const steps = planDraft.steps
      .split("\n")
      .map((step) => step.trim())
      .filter(Boolean);
    if (!title || !summary || steps.length === 0) return;
    updateState((current) => ({
      ...current,
      emergencyPlans: [
        ...current.emergencyPlans,
        { id: `plan-${Date.now()}`, title, summary, steps },
      ],
    }));
    closeModal();
  };

  const saveNote = () => {
    const label = noteDraft.label.trim();
    const value = noteDraft.value.trim();
    if (!label || !value) return;
    updateState((current) => ({
      ...current,
      homeInfo: [...current.homeInfo, { label, value }],
    }));
    closeModal();
  };

  const saveDraft = () => {
    if (modal === "contact") saveContact();
    else if (modal === "plan") savePlan();
    else if (modal === "note") saveNote();
  };

  return (
    <>
      <div className="immersive-page">
        <PageHeader
          eyebrow="Emergency"
          title="In an Emergency, We're Here"
          subtitle="Fast access to what matters most, when it matters most."
          heroImage="/images/pages/emergency-hero.webp"
          heroPosition="center 44%"
          heroTone="linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(95,24,20,0.12) 42%, rgba(47,28,24,0.5) 100%)"
          badge="Owner view"
          action={
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full border border-white/30 bg-white/14 px-3 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-md sm:inline-flex">
                {repositoryMode === "supabase"
                  ? "Secure sync"
                  : "Local session"}
              </span>
              <Link
                href="/emergency/access"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/18 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/24"
              >
                Trusted access
              </Link>
            </div>
          }
        />
        <EmergencyContent
          careContacts={state.careContacts}
          contacts={state.emergencyContacts}
          emergencyDocumentCount={
            state.vaultDocuments.filter((document) => document.emergencyVisible)
              .length
          }
          notes={state.homeInfo}
          onAdd={setModal}
          plans={state.emergencyPlans}
        />
      </div>
      <EmergencyEditorModal
        contactDraft={contactDraft}
        mode={modal}
        noteDraft={noteDraft}
        onClose={closeModal}
        onSave={saveDraft}
        planDraft={planDraft}
        setContactDraft={setContactDraft}
        setNoteDraft={setNoteDraft}
        setPlanDraft={setPlanDraft}
      />
    </>
  );
}
