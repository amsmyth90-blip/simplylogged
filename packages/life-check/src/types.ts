export const LIFE_CHECK_SCHEMA_VERSION = 1;
export const lifeCheckFields = ["homeTenure", "vehicles", "pets", "internationalTravel",
  "householdCollaboration", "documentStorage", "reminders"] as const;
export const homeTenureAnswers = ["not-set", "own", "rent", "other", "not-applicable"] as const;
export const applicabilityAnswers = ["not-set", "yes", "no"] as const;
export const lifeCheckTargets = ["HOME", "FILES", "SCAN", "REMINDERS", "FAMILY", "EMERGENCY",
  "FRONT_GATE", "GARAGE", "GARDEN", "DRIVEWAY", "OFFICE", "MAILBOX"] as const;

export type LifeCheckField = (typeof lifeCheckFields)[number];
export type HomeTenureAnswer = (typeof homeTenureAnswers)[number];
export type ApplicabilityAnswer = (typeof applicabilityAnswers)[number];
export type LifeCheckTarget = (typeof lifeCheckTargets)[number];

export type LifeCheckAnswers = {
  homeTenure: HomeTenureAnswer;
  vehicles: ApplicabilityAnswer;
  pets: ApplicabilityAnswer;
  internationalTravel: ApplicabilityAnswer;
  householdCollaboration: ApplicabilityAnswer;
  documentStorage: ApplicabilityAnswer;
  reminders: ApplicabilityAnswer;
  completedAt: string | null;
};

export type LifeCheckCategory = {
  id: string; label: string; score: number; completed: number; total: number;
};
export type LifeCheckRecommendation = {
  id: string; title: string; detail: string; target: LifeCheckTarget;
};
export type LifeCheckSnapshot = {
  schemaVersion: typeof LIFE_CHECK_SCHEMA_VERSION;
  revision: string | null;
  answers: LifeCheckAnswers;
  score: number;
  answered: number;
  totalAnswers: number;
  categories: LifeCheckCategory[];
  recommendations: LifeCheckRecommendation[];
};
export type LifeCheckMutation = {
  revision: string | null; field: LifeCheckField; value: string;
};
