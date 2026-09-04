import type { IconName } from "@/components/UiIcon";
import type { WillsWishesRecord } from "@/lib/diarydock-data";
import type { VaultDocument } from "@/lib/mock-data";

export type OfficePanel = "inbox" | "admin" | "documents" | null;
export type OfficeDrawerId = "identity" | "wishes" | "home" | "finance";
export type OfficeWorkspaceProps = { initialDrawer?: OfficeDrawerId };
export type WishesStep = "about" | "will" | "funeral" | "messages" | "access";

export const officeDrawers: Array<{
  id: OfficeDrawerId;
  label: string;
  detail: string;
  icon: IconName;
  tone: string;
}> = [
  { id: "identity", label: "Personal ID", detail: "Passports, licences and certificates", icon: "file", tone: "bg-[#f2dfd7] text-[#8a5145]" },
  { id: "wishes", label: "Wills & wishes", detail: "Wills, funeral wishes and POA", icon: "briefcase", tone: "bg-[#eadfca] text-[#746144]" },
  { id: "home", label: "Home & insurance", detail: "Home insurance, deeds and mortgage", icon: "home", tone: "bg-[#e2eadc] text-[#5d7353]" },
  { id: "finance", label: "Bills & finances", detail: "Household bills, banking, tax and pensions", icon: "chart", tone: "bg-[#dfe8ee] text-[#506b7a]" },
];

export const wishesSteps: Array<{
  id: WishesStep;
  label: string;
  detail: string;
  icon: IconName;
}> = [
  { id: "about", label: "About me", detail: "Personal details", icon: "users" },
  { id: "will", label: "My will", detail: "Executors & solicitor", icon: "briefcase" },
  { id: "funeral", label: "Funeral wishes", detail: "Service preferences", icon: "heart" },
  { id: "messages", label: "Messages & wishes", detail: "Personal journal", icon: "file" },
  { id: "access", label: "Access & review", detail: "Trusted people", icon: "lock" },
];

export function documentBelongsInDrawer(document: VaultDocument, drawer: OfficeDrawerId) {
  const text = `${document.title} ${document.category} ${document.roomName ?? ""}`.toLowerCase();
  const roomId = document.roomId?.toLowerCase();
  if (roomId && roomId !== "office") return false;
  if (
    document.category === "Health & Medical" ||
    document.category === "Memories" ||
    /\b(car|vehicle|motor|mot|pet|veterinary|vaccination|travel|flight|boarding pass|recipe|school|garden)\b/.test(text)
  ) {
    return false;
  }
  if (drawer === "identity") {
    return document.category === "Identity" || /passport|identity|birth certificate|marriage certificate|driving licence/.test(text);
  }
  if (drawer === "wishes") {
    return /\bwills?\b|letters? of wishes|funeral wishes|power of attorney|executor|probate/.test(text);
  }
  if (drawer === "home") {
    return document.category === "Home & Property" || /home insurance|house insurance|buildings insurance|contents insurance|house deed|property deed|mortgage/.test(text);
  }
  if (/mortgage/.test(text)) return false;
  return document.category === "Finance" || /bill|invoice|statement|council tax|utility|electric|gas|water|broadband|phone|bank|pension|tax|savings|investment|payslip/.test(text);
}

export function wishesStepComplete(step: WishesStep, record: WillsWishesRecord) {
  if (step === "about") return Boolean(record.fullName.trim() && record.address.trim());
  if (step === "will") return Boolean(record.willStatus.trim() && record.executorName.trim());
  if (step === "funeral") return Boolean(record.funeralPreference.trim() && record.funeralDetails.trim());
  if (step === "messages") return Boolean(record.personalMessage.trim());
  return Boolean(record.trustedPeople.trim() && record.reviewFrequency.trim());
}
