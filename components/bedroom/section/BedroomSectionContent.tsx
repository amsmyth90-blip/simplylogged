import { BedroomCarePreferences } from "./BedroomCarePreferences";
import { BedroomContacts } from "./BedroomContacts";
import { BedroomDocuments } from "./BedroomDocuments";
import { BedroomFamilyHealth } from "./BedroomFamilyHealth";
import { BedroomRecords } from "./BedroomRecords";
import { HealthProfileSection } from "./HealthProfileSection";
import type { BedroomSectionController } from "./useBedroomSection";

export function BedroomSectionContent({
  bedroom,
}: {
  bedroom: BedroomSectionController;
}) {
  if (bedroom.section === "health-profile" || bedroom.section === "emergency") {
    return (
      <HealthProfileSection
        emergencyOnly={bedroom.section === "emergency"}
        onMessage={bedroom.setMessage}
      />
    );
  }
  if (bedroom.section === "medical-records") {
    return <BedroomDocuments bedroom={bedroom} />;
  }
  if (bedroom.section === "family-health") {
    return <BedroomFamilyHealth bedroom={bedroom} />;
  }
  if (bedroom.section === "contacts") {
    return <BedroomContacts bedroom={bedroom} />;
  }
  if (bedroom.section === "care-preferences") {
    return <BedroomCarePreferences bedroom={bedroom} />;
  }
  return <BedroomRecords bedroom={bedroom} />;
}
