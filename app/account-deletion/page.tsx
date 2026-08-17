import type { Metadata } from "next";

import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Account Deletion" };

export default function AccountDeletionPage() {
  return (
    <LegalPage
      eyebrow="Account"
      title="Delete your DiaryDock account"
      subtitle="How to request deletion of your account and personal data."
      effectiveDate="17 August 2026"
      sections={[
        {
          title: "How to request deletion",
          body: [
            "If you can sign in, open DiaryDock Settings and choose Request account deletion under Privacy, terms & data.",
            "If you cannot sign in, email hello@diarydock.com from the email address linked to your DiaryDock account and include the words Account deletion request in the subject line."
          ]
        },
        {
          title: "What deletion includes",
          body: [
            "Deletion includes your DiaryDock account profile, private app state, document metadata, reminders, household records you own, and uploaded files associated with your account.",
            "If you are part of a shared household, records owned by another account may remain with that household owner unless they also request deletion or remove shared access."
          ]
        },
        {
          title: "What may be retained temporarily",
          body: [
            "Some information may remain temporarily in encrypted backups, security logs, or records needed to comply with legal obligations, prevent fraud, or resolve disputes.",
            "Normal deletion requests are processed within 30 days after account ownership has been verified."
          ]
        },
        {
          title: "Before deleting",
          body: [
            "Download any documents or information you want to keep before requesting deletion. Once deletion is processed, DiaryDock may not be able to recover your account or uploaded files."
          ]
        }
      ]}
    />
  );
}
