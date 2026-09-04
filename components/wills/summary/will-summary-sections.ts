import type { IconName } from "@/components/UiIcon";
import type { WillDocumentAnalysis } from "@/lib/will-document-analysis";
import type { WillRecord } from "@/lib/will-records";

export type WillSummarySection = {
  title: string;
  icon: IconName;
  text: string;
};

export function buildWillSummarySections(
  record: WillRecord,
  detected?: WillDocumentAnalysis,
): WillSummarySection[] {
  const confirmedPreparation = (key: keyof WillRecord["preparation"]) => {
    const item = record.preparation[key];
    return item.status === "complete" && item.confirmedData.trim()
      ? item.confirmedData.trim()
      : "Not confirmed in your organiser yet.";
  };
  const detectedText = (
    values: string[] | undefined,
    confirmedFallback: string,
  ) => (values?.length ? values.join(" · ") : confirmedFallback);

  return [
    {
      title: "Executors",
      icon: "users",
      text: detectedText(
        detected?.executors,
        [
          record.primaryExecutor.name
            ? `Primary: ${record.primaryExecutor.name}`
            : "",
          record.backupExecutor.name
            ? `Backup: ${record.backupExecutor.name}`
            : "",
        ]
          .filter(Boolean)
          .join(" · ") || confirmedPreparation("executors"),
      ),
    },
    {
      title: "Beneficiaries",
      icon: "heart",
      text: detectedText(
        detected?.beneficiaries,
        confirmedPreparation("beneficiaries"),
      ),
    },
    {
      title: "Guardians",
      icon: "shield",
      text: detectedText(
        detected?.guardians,
        confirmedPreparation("guardians"),
      ),
    },
    {
      title: "Specific gifts",
      icon: "star",
      text: detectedText(
        detected?.specificGifts,
        confirmedPreparation("specific-gifts"),
      ),
    },
    {
      title: "Charitable gifts",
      icon: "leaf",
      text: detectedText(
        detected?.charitableGifts,
        confirmedPreparation("charitable-gifts"),
      ),
    },
    {
      title: "Residue of estate",
      icon: "archive",
      text: detectedText(
        detected?.residueOfEstate,
        confirmedPreparation("residue-estate"),
      ),
    },
    {
      title: "Funeral wishes references",
      icon: "file",
      text: detectedText(
        detected?.funeralWishesReferences,
        "No reference was identified. Keep separate preferences in My Wishes & Preferences.",
      ),
    },
    {
      title: "Conditions or special instructions",
      icon: "alert",
      text: detectedText(
        detected?.conditionsOrInstructions,
        "No separate instruction was identified.",
      ),
    },
    {
      title: "Questions or unclear wording",
      icon: "search",
      text: detectedText(
        detected?.questionsOrUnclearWording,
        record.preparation["solicitor-questions"].confirmedData.trim() ||
          "No specific question was identified. Review any uncertainty with a qualified solicitor.",
      ),
    },
  ];
}
