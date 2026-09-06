export const KITCHEN_CALENDAR_SCHEMA_VERSION = 1;

export const kitchenCalendarCategories = [
  "appointments",
  "school",
  "meals",
  "family",
] as const;

export type KitchenCalendarCategory = typeof kitchenCalendarCategories[number];

export type KitchenCalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  category: KitchenCalendarCategory;
  assignedTo?: string;
  noticeId?: string;
};

export type KitchenCalendarSnapshot = {
  schemaVersion: typeof KITCHEN_CALENDAR_SCHEMA_VERSION;
  revision: string | null;
  events: KitchenCalendarEvent[];
};

export type KitchenCalendarMutation =
  | {
      operation: "SAVE_EVENT";
      revision: string | null;
      eventId: string | null;
      event: Omit<KitchenCalendarEvent, "id" | "noticeId">;
    }
  | {
      operation: "DELETE_EVENT";
      revision: string | null;
      eventId: string;
    };
