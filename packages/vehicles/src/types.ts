export const GARAGE_SCHEMA_VERSION = 1;

export const garageExpenseCategories = [
  "Fuel",
  "Service",
  "Repair",
  "Tax",
  "Insurance",
  "Breakdown",
  "Tyres",
  "Parking",
  "Other",
] as const;

export type GarageExpenseCategory = (typeof garageExpenseCategories)[number];

export type GarageService = {
  id: string;
  kind: "service" | "repair" | "inspection";
  title: string;
  provider: string;
  date: string;
  mileage: number | null;
  cost: number | null;
  notes: string;
};

export type GarageExpense = {
  id: string;
  category: GarageExpenseCategory;
  title: string;
  provider: string;
  amount: number;
  date: string;
  notes: string;
};

export type GarageNote = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
};

export type GarageVehicle = {
  id: string;
  displayName: string;
  make: string;
  model: string;
  registration: string;
  year: number | null;
  mileage: number | null;
  motDueDate: string;
  taxDueDate: string;
  insuranceRenewalDate: string;
  nextServiceDate: string;
  breakdownRenewalDate: string;
  documentCount: number;
  totalSpend: number;
  services: GarageService[];
  expenses: GarageExpense[];
  notes: GarageNote[];
};

export type GarageSnapshot = {
  schemaVersion: typeof GARAGE_SCHEMA_VERSION;
  revision: string | null;
  vehicles: GarageVehicle[];
};

export type GarageMutation =
  | {
      operation: "ADD_VEHICLE";
      revision: string | null;
      vehicleId: string;
      nickname: string;
      make: string;
      model: string;
      registration: string;
      year: number | null;
    }
  | {
      operation: "ADD_EXPENSE";
      revision: string | null;
      vehicleId: string;
      category: GarageExpenseCategory;
      title: string;
      provider: string;
      amount: number;
      date: string;
      notes: string;
    }
  | {
      operation: "ADD_SERVICE";
      revision: string | null;
      vehicleId: string;
      kind: GarageService["kind"];
      title: string;
      provider: string;
      date: string;
      mileage: number | null;
      cost: number | null;
      notes: string;
    }
  | {
      operation: "ADD_MILEAGE";
      revision: string | null;
      vehicleId: string;
      mileage: number;
      recordedAt: string;
      note: string;
    }
  | {
      operation: "ADD_NOTE";
      revision: string | null;
      vehicleId: string;
      title: string;
      content: string;
    };
