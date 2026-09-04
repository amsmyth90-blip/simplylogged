"use client";

import { useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import type { LifeBeneficiary, LifePolicyDetails } from "@/lib/insurance-records";

import { defaultLifeDetails, useLifePolicy } from "./life-insurance-shared";

const emptyBeneficiary = () => ({
  name: "",
  relationship: "",
  percentage: 0,
  primary: false,
  notes: ""
});

export function useLifeBeneficiariesController() {
  const { state, updateState } = useDiaryDockData();
  const policy = useLifePolicy();
  const storedDetails = policy
    ? state.insurance.lifePolicyDetails.find(item => item.policyId === policy.id)
    : undefined;
  const [trust, setTrust] = useState<LifePolicyDetails>(() =>
    storedDetails ?? defaultLifeDetails(policy?.id ?? "")
  );
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyBeneficiary);
  const beneficiaries = policy
    ? state.insurance.lifeBeneficiaries.filter(item => item.policyId === policy.id)
    : [];
  const total = beneficiaries.reduce((sum, item) => sum + item.percentage, 0);
  const householdNames = Array.from(new Set([
    ...state.householdMembers.map(member => member.name),
    ...state.householdProfiles.map(profile => profile.name)
  ])).filter(Boolean);

  const addBeneficiary = () => {
    if (!policy || !draft.name.trim()) return;
    const now = new Date().toISOString();
    const beneficiary: LifeBeneficiary = {
      id: crypto.randomUUID(),
      policyId: policy.id,
      ...draft,
      createdAt: now,
      updatedAt: now
    };
    updateState(current => ({
      ...current,
      insurance: {
        ...current.insurance,
        lifeBeneficiaries: [beneficiary, ...current.insurance.lifeBeneficiaries]
      }
    }));
    setDraft(emptyBeneficiary());
    setShowForm(false);
  };

  const removeBeneficiary = (id: string) => updateState(current => ({
    ...current,
    insurance: {
      ...current.insurance,
      lifeBeneficiaries: current.insurance.lifeBeneficiaries.filter(item => item.id !== id)
    }
  }));

  const toggleLinkedPerson = (name: string) => {
    if (!policy) return;
    updateState(current => ({
      ...current,
      insurance: {
        ...current.insurance,
        policies: current.insurance.policies.map(item =>
          item.id === policy.id
            ? {
                ...item,
                linkedPeople: item.linkedPeople.includes(name)
                  ? item.linkedPeople.filter(person => person !== name)
                  : [...item.linkedPeople, name],
                updatedAt: new Date().toISOString()
              }
            : item
        )
      }
    }));
  };

  const saveTrust = () => {
    if (!policy) return;
    const updated = {
      ...trust,
      policyId: policy.id,
      lastReviewedAt: new Date().toISOString()
    };
    updateState(current => ({
      ...current,
      insurance: {
        ...current.insurance,
        lifePolicyDetails: [
          updated,
          ...current.insurance.lifePolicyDetails.filter(item => item.policyId !== policy.id)
        ]
      }
    }));
    setTrust(updated);
  };

  return {
    policy,
    trust,
    setTrust,
    showForm,
    setShowForm,
    draft,
    setDraft,
    beneficiaries,
    total,
    householdNames,
    addBeneficiary,
    removeBeneficiary,
    toggleLinkedPerson,
    saveTrust
  };
}

export type LifeBeneficiariesController = ReturnType<typeof useLifeBeneficiariesController>;
