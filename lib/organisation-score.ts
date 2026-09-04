import type { DiaryDockAppState, LifeCheckState } from "@/lib/diarydock-data";

export type OrganisationRecommendation = {
  id: string;
  categoryId: string;
  title: string;
  detail: string;
  href: string;
};

export type OrganisationCategoryScore = {
  id: string;
  label: string;
  score: number;
  completed: number;
  total: number;
  weight: number;
};

export type OrganisationScore = {
  score: number;
  answered: number;
  totalAnswers: number;
  categories: OrganisationCategoryScore[];
  recommendations: OrganisationRecommendation[];
};

type ScoreState = Pick<DiaryDockAppState,
  "onboarding" | "settingsProfile" | "vaultDocuments" | "reminders" | "vehicles" | "trips" |
  "insurance" | "bills" | "homeInfo" | "emergencyContacts" | "householdMembers" | "householdProfiles" | "familyInvites"
>;

type Check = Omit<OrganisationRecommendation, "categoryId"> & { complete: boolean };
type CategoryDefinition = {
  id: string;
  label: string;
  weight: number;
  applies: (lifeCheck: LifeCheckState) => boolean;
  checks: (state: ScoreState) => Check[];
};

export const LIFE_CHECK_KEYS: (keyof Omit<LifeCheckState, "completedAt">)[] = [
  "homeTenure",
  "vehicles",
  "pets",
  "internationalTravel",
  "householdCollaboration",
  "documentStorage",
  "reminders"
];

export function isLifeCheckComplete(lifeCheck: LifeCheckState) {
  return LIFE_CHECK_KEYS.every((key) => lifeCheck[key] !== "not-set");
}

function hasUsefulDate(value?: string) {
  return Boolean(value && Number.isFinite(Date.parse(value.includes("T") ? value : `${value}T12:00:00`)));
}

const categories: CategoryDefinition[] = [
  {
    id: "essentials",
    label: "Essentials",
    weight: 20,
    applies: () => true,
    checks: (state) => [
      { id: "profile-name", title: "Add your name", detail: "Finish the basic profile so DiaryDock can personalise your home.", href: "/onboarding", complete: Boolean(state.settingsProfile.name.trim()) },
      { id: "household-name", title: "Name your household", detail: "Give your DiaryDock home a recognisable name.", href: "/onboarding", complete: Boolean(state.onboarding.householdName.trim()) },
      { id: "emergency-contact", title: "Add an emergency contact", detail: "Keep one trusted contact ready when you need it.", href: "/emergency", complete: state.emergencyContacts.length > 0 }
    ]
  },
  {
    id: "home",
    label: "Home & money",
    weight: 15,
    applies: (lifeCheck) => lifeCheck.homeTenure !== "not-set" && lifeCheck.homeTenure !== "not-applicable",
    checks: (state) => [
      { id: "home-info", title: "Add key home details", detail: "Record a useful home detail such as a supplier or property note.", href: "/room/kitchen", complete: state.homeInfo.length > 0 },
      { id: "home-bill", title: "Add a household bill", detail: "Keep one regular household cost in view.", href: "/office/bills/new", complete: state.bills.bills.some((bill) => bill.status !== "cancelled") },
      { id: "home-cover", title: "Record your home cover", detail: "Save an active home insurance policy or mark this area not applicable in Life Check.", href: "/office/insurance/new", complete: state.insurance.policies.some((policy) => policy.type === "Home" && policy.status === "active") }
    ]
  },
  {
    id: "documents",
    label: "Documents",
    weight: 20,
    applies: (lifeCheck) => lifeCheck.documentStorage === "yes",
    checks: (state) => [
      { id: "document-saved", title: "Save an important document", detail: "Scan or upload a record you want to keep private.", href: "/capture", complete: state.vaultDocuments.length > 0 },
      { id: "document-review", title: "Review captured details", detail: "Check any captured details before relying on them.", href: "/review-inbox", complete: state.vaultDocuments.length > 0 && state.vaultDocuments.every((document) => document.reviewStatus !== "needs-review") }
    ]
  },
  {
    id: "reminders",
    label: "Reminders",
    weight: 15,
    applies: (lifeCheck) => lifeCheck.reminders === "yes",
    checks: (state) => [
      { id: "reminder-created", title: "Create a useful reminder", detail: "Add one date you would like DiaryDock to keep in view.", href: "/reminders", complete: state.reminders.some((reminder) => reminder.group !== "done") },
      { id: "linked-date", title: "Link a reminder to its source date", detail: "Confirm a dated document suggestion so changes stay synchronised.", href: "/review-actions", complete: state.reminders.some((reminder) => reminder.origin === "SYSTEM_GENERATED" && hasUsefulDate(reminder.sourceDueAt)) }
    ]
  },
  {
    id: "vehicles",
    label: "Vehicles",
    weight: 15,
    applies: (lifeCheck) => lifeCheck.vehicles === "yes",
    checks: (state) => [
      { id: "vehicle-record", title: "Add your vehicle", detail: "Create a vehicle record with its registration.", href: "/room/garage", complete: state.vehicles.vehicles.some((vehicle) => Boolean(vehicle.registration.trim())) },
      { id: "vehicle-dates", title: "Add key vehicle dates", detail: "Record an MOT, tax or insurance date.", href: "/room/garage", complete: state.vehicles.vehicles.some((vehicle) => [vehicle.motDueDate, vehicle.taxDueDate, vehicle.insuranceRenewalDate].some(hasUsefulDate)) },
      { id: "vehicle-document", title: "Link a vehicle document", detail: "Attach a policy, MOT or service record to a vehicle.", href: "/room/garage", complete: state.vehicles.vehicles.some((vehicle) => vehicle.documentIds.length > 0) }
    ]
  },
  {
    id: "pets",
    label: "Pets",
    weight: 10,
    applies: (lifeCheck) => lifeCheck.pets === "yes",
    checks: (state) => [
      { id: "pet-record", title: "Add a pet record", detail: "Save a vaccination, insurance or identification document for your pet.", href: "/room/garden", complete: state.vaultDocuments.some((document) => document.roomId === "garden") }
    ]
  },
  {
    id: "travel",
    label: "Travel",
    weight: 10,
    applies: (lifeCheck) => lifeCheck.internationalTravel === "yes",
    checks: (state) => [
      { id: "trip-record", title: "Add an upcoming trip", detail: "Start a trip plan with destination and dates.", href: "/driveway/trips/new", complete: state.trips.trips.some((trip) => Boolean(trip.destination && trip.startDate)) },
      { id: "travel-document", title: "Keep a travel document", detail: "Save a passport, insurance or booking document.", href: "/capture", complete: state.vaultDocuments.some((document) => document.roomId === "driveway" || /passport|travel|flight|booking/i.test(document.title)) }
    ]
  },
  {
    id: "household",
    label: "Household",
    weight: 10,
    applies: (lifeCheck) => lifeCheck.householdCollaboration === "yes",
    checks: (state) => [
      { id: "household-person", title: "Add a household person", detail: "Create a profile or invite someone when you are ready.", href: "/family/household", complete: state.householdMembers.length > 1 || state.householdProfiles.length > 0 || state.familyInvites.length > 0 }
    ]
  }
];

export function calculateOrganisationScore(state: ScoreState): OrganisationScore {
  const lifeCheck = state.onboarding.lifeCheck;
  const answered = LIFE_CHECK_KEYS.filter((key) => lifeCheck[key] !== "not-set").length;
  const applicable = categories.filter((category) => category.applies(lifeCheck));
  const categoryScores = applicable.map((category) => {
    const checks = category.checks(state);
    const completed = checks.filter((check) => check.complete).length;
    return { id: category.id, label: category.label, score: Math.round((completed / checks.length) * 100), completed, total: checks.length, weight: category.weight };
  });
  const lifeCheckWeight = 20;
  const weightedTotal = categoryScores.reduce((sum, category) => sum + category.score * category.weight, (answered / LIFE_CHECK_KEYS.length) * 100 * lifeCheckWeight);
  const totalWeight = categoryScores.reduce((sum, category) => sum + category.weight, lifeCheckWeight);
  const recommendations: OrganisationRecommendation[] = [];
  if (!isLifeCheckComplete(lifeCheck)) {
    recommendations.push({ id: "finish-life-check", categoryId: "life-check", title: "Finish your Life Check", detail: "Tell DiaryDock which areas apply so your score stays fair and personal.", href: "/life-check" });
  }
  for (const category of applicable) {
    for (const check of category.checks(state)) {
      if (!check.complete) recommendations.push({ ...check, categoryId: category.id });
    }
  }
  return {
    score: Math.round(weightedTotal / totalWeight),
    answered,
    totalAnswers: LIFE_CHECK_KEYS.length,
    categories: categoryScores,
    recommendations: recommendations.slice(0, 8)
  };
}
