import type { VehicleTab } from "./vehicle-profile-model";

export const vehiclePageTitles: Record<VehicleTab, string> = {
  overview: "",
  servicing: "Servicing",
  repairs: "Repairs",
  costs: "Costs & Running Expenses",
  documents: "Documents",
  notes: "Notes",
};

export const vehicleActionLabels: Record<VehicleTab, string> = {
  overview: "Edit",
  servicing: "Add",
  repairs: "Add",
  costs: "Expense",
  documents: "Upload",
  notes: "Add note",
};
