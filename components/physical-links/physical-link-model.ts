export type { PhysicalAsset, PhysicalLink } from "@diarydock/physical-links";

export type PhysicalAssetFormDraft = {
  name: string;
  category: "APPLIANCE" | "BOILER" | "EQUIPMENT" | "OTHER";
  location: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  warrantyDueAt: string;
  nextServiceAt: string;
  maintenanceNotes: string;
};

export type NewPhysicalLink = { id: string; url: string };

export const emptyPhysicalAssetDraft: PhysicalAssetFormDraft = {
  name: "", category: "APPLIANCE", location: "", manufacturer: "", model: "",
  serialNumber: "", warrantyDueAt: "", nextServiceAt: "", maintenanceNotes: "",
};
