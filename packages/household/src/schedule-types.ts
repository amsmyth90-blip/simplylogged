export const HOUSEHOLD_SCHEDULES_SCHEMA_VERSION = 1;

export const householdScheduleColours = ["sage", "blue", "clay", "gold"] as const;
export const householdScheduleRepeats = ["weekly", "term-time"] as const;

export type HouseholdScheduleColour = (typeof householdScheduleColours)[number];
export type HouseholdScheduleRepeat = (typeof householdScheduleRepeats)[number];

export type HouseholdScheduleRoutine = {
  id: string;
  title: string;
  childName: string;
  day: number;
  startTime: string;
  endTime: string;
  repeat: HouseholdScheduleRepeat;
  location: string;
  responsibleAdult: string;
  transport: string;
  colour: HouseholdScheduleColour;
  paused: boolean;
};

export type SaveHouseholdScheduleRoutine = Omit<HouseholdScheduleRoutine, "id">;

export type HouseholdSchedulesSnapshot = {
  schemaVersion: typeof HOUSEHOLD_SCHEDULES_SCHEMA_VERSION;
  revision: string | null;
  people: string[];
  routines: HouseholdScheduleRoutine[];
};

export type HouseholdSchedulesMutation =
  | {
      operation: "SAVE_ROUTINE";
      revision: string | null;
      routineId: string | null;
      routine: SaveHouseholdScheduleRoutine;
    }
  | {
      operation: "DELETE_ROUTINE";
      revision: string | null;
      routineId: string;
    };
