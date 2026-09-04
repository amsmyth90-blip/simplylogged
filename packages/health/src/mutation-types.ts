import type {
  DentalOpticalRecord,
  HealthAllergy,
  HealthAppointment,
  HealthCondition,
  HealthMedication,
  HealthProfile,
  HealthTest,
  HealthTimelineEvent,
  HealthVaccination,
  WellbeingNote,
} from "./types.ts";

type MutationBase = { revision: string | null };

export type HealthMutation =
  | (MutationBase & {
      operation: "UPDATE_OVERVIEW";
      profile: HealthProfile;
      carePreferences: string;
    })
  | (MutationBase & { operation: "UPDATE_PROFILE"; profile: HealthProfile })
  | (MutationBase & {
      operation: "UPDATE_CARE_PREFERENCES";
      carePreferences: string;
    })
  | (MutationBase & {
      operation: "UPDATE_FAMILY_MEMBERS";
      familyMemberIds: string[];
    })
  | (MutationBase & {
      operation: "ADD_CONDITION";
      record: HealthCondition;
      timeline: HealthTimelineEvent;
    })
  | (MutationBase & {
      operation: "ADD_ALLERGY";
      record: HealthAllergy;
      timeline: HealthTimelineEvent;
    })
  | (MutationBase & {
      operation: "ADD_MEDICATION";
      record: HealthMedication;
      timeline: HealthTimelineEvent;
    })
  | (MutationBase & {
      operation: "ADD_APPOINTMENT";
      record: HealthAppointment;
      timeline: HealthTimelineEvent;
    })
  | (MutationBase & {
      operation: "ADD_TEST";
      record: HealthTest;
      timeline: HealthTimelineEvent;
    })
  | (MutationBase & {
      operation: "ADD_VACCINATION";
      record: HealthVaccination;
      timeline: HealthTimelineEvent;
    })
  | (MutationBase & {
      operation: "ADD_DENTAL_OPTICAL";
      record: DentalOpticalRecord;
      timeline: HealthTimelineEvent;
    })
  | (MutationBase & {
      operation: "ADD_WELLBEING";
      record: WellbeingNote;
      timeline: HealthTimelineEvent;
    })
  | (MutationBase & {
      operation: "ADD_TIMELINE";
      record: HealthTimelineEvent;
    });
