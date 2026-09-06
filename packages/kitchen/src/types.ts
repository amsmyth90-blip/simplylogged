export const KITCHEN_SCHEMA_VERSION = 1;

export type KitchenSection = "Pantry" | "Shopping";

export type KitchenItem = {
  id: string;
  name: string;
  checked: boolean;
  section: KitchenSection;
};

export type KitchenSnapshot = {
  schemaVersion: typeof KITCHEN_SCHEMA_VERSION;
  revision: string | null;
  items: KitchenItem[];
};

export type KitchenMutation =
  | { operation: "ADD_ITEM"; revision: string | null; name: string; section: KitchenSection }
  | { operation: "ADD_ITEMS"; revision: string | null; names: string[]; section: KitchenSection }
  | { operation: "TOGGLE_ITEM"; revision: string | null; itemId: string }
  | { operation: "MOVE_ITEM"; revision: string | null; itemId: string; section: KitchenSection }
  | { operation: "DELETE_ITEM"; revision: string | null; itemId: string };
