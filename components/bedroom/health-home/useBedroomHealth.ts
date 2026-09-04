"use client";

import { useMemo, useState } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { healthProfileProgress } from "@/lib/health-records";

import {
  daysFromNow,
  formatHealthDate,
  genuineHealthDocuments,
  primarySections,
  secondarySections,
  type HealthLink,
  type HealthReview,
} from "./health-home-model";

export function useBedroomHealth() {
  const { state, hydrated } = useDiaryDockData();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const health = state.health;
  const profileProgress = healthProfileProgress(health);
  const healthDocuments = useMemo(
    () => genuineHealthDocuments(state.vaultDocuments),
    [state.vaultDocuments],
  );
  const upcomingAppointments = useMemo(
    () =>
      health.appointments
        .filter(
          (item) => item.status === "planned" && daysFromNow(item.date) >= 0,
        )
        .sort((a, b) =>
          `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
        ),
    [health.appointments],
  );
  const currentMedications = health.medications.filter(
    (item) => item.status === "current",
  );
  const timeline = [...health.timeline].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const contacts = state.professionalContacts.contacts;
  const gp = contacts.find(
    (contact) => contact.id === health.profile.gpContactId,
  );
  const pharmacy = contacts.find(
    (contact) => contact.id === health.profile.pharmacyContactId,
  );

  const sectionCounts: Record<string, number> = {
    "Health Profile": profileProgress.completed,
    "Medical Records": healthDocuments.length,
    "Medications & Prescriptions": currentMedications.length,
    Appointments: upcomingAppointments.length,
    "Tests & Results": health.tests.length,
    "Health Timeline": health.timeline.length,
    "Dental & Optical": health.dentalOptical.length,
    "Emergency Medical Info": profileProgress.completed,
    Vaccinations: health.vaccinations.length,
    "Family Health": health.familyMemberIds.length,
    "Healthcare Contacts": [
      health.profile.gpContactId,
      health.profile.pharmacyContactId,
    ].filter(Boolean).length,
    Allergies: health.allergies.length,
    Conditions: health.conditions.length,
    "Sleep & Wellbeing": health.wellbeing.length,
  };

  const reviews: HealthReview[] = [
    ...upcomingAppointments
      .filter((item) => daysFromNow(item.date) <= 14)
      .map((item) => ({
        id: `appointment-${item.id}`,
        icon: "calendar" as const,
        text: `${item.title} is coming up ${formatHealthDate(item.date)}.`,
        title: item.title,
        detail: formatHealthDate(item.date),
        href: "/bedroom/appointments",
      })),
    ...currentMedications
      .filter((item) => item.reviewDate && daysFromNow(item.reviewDate) <= 30)
      .map((item) => ({
        id: `medication-${item.id}`,
        icon: "file" as const,
        text: `${item.name} has a recorded review date of ${formatHealthDate(item.reviewDate)}.`,
        title: item.name,
        detail: item.reviewDate,
        href: "/bedroom/medications",
      })),
    ...healthDocuments
      .filter((item) => item.reviewStatus === "needs-review")
      .map((item) => ({
        id: `document-${item.id}`,
        icon: "folder" as const,
        text: `${item.title} needs your review.`,
        title: item.title,
        detail: item.updated,
        href: `/document/${item.id}?from=bedroom`,
      })),
    ...(!health.profile.emergencyContactId || !health.profile.gpContactId
      ? [
          {
            id: "profile-incomplete",
            icon: "shield" as const,
            text: "Your emergency profile still has important details to add.",
            title: "Emergency profile",
            detail: "Important details to add",
            href: "/bedroom/emergency",
          },
        ]
      : []),
  ].slice(0, 5);

  const searchable: HealthLink[] = [
    ...primarySections.map(({ title, description: detail, href, icon }) => ({
      title,
      detail,
      href,
      icon,
    })),
    ...secondarySections.map(({ title, description: detail, href, icon }) => ({
      title,
      detail,
      href,
      icon,
    })),
    ...currentMedications.map((item) => ({
      title: item.name,
      detail:
        [item.dose, item.frequency].filter(Boolean).join(" · ") || "Medication",
      href: "/bedroom/medications",
      icon: "file" as const,
    })),
    ...health.appointments.map((item) => ({
      title: item.title,
      detail: [item.provider, formatHealthDate(item.date)]
        .filter(Boolean)
        .join(" · "),
      href: "/bedroom/appointments",
      icon: "calendar" as const,
    })),
    ...healthDocuments.map((item) => ({
      title: item.title,
      detail: [item.issuer, item.updated].filter(Boolean).join(" · "),
      href: `/document/${item.id}?from=bedroom`,
      icon: "folder" as const,
    })),
  ];
  const normalisedQuery = query.trim().toLowerCase();
  const searchResults = normalisedQuery
    ? searchable
        .filter((item) =>
          `${item.title} ${item.detail}`
            .toLowerCase()
            .includes(normalisedQuery),
        )
        .slice(0, 10)
    : [];

  return {
    hydrated,
    health,
    profileProgress,
    healthDocuments,
    upcomingAppointments,
    currentMedications,
    timeline,
    gp,
    pharmacy,
    sectionCounts,
    reviews,
    searchResults,
    searchOpen,
    setSearchOpen,
    query,
    setQuery,
    addOpen,
    setAddOpen,
  };
}

export type BedroomHealthViewModel = ReturnType<typeof useBedroomHealth>;
