import type { Metadata } from "next";

import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Support" };

export default function SupportPage() {
  return (
    <LegalPage
      eyebrow="Support"
      title="DiaryDock Support"
      subtitle="Help with your account, privacy, data, and app access."
      effectiveDate="17 August 2026"
      sections={[
        {
          title: "Contact support",
          body: [
            "For account help, privacy questions, data export requests, deletion requests, or app review enquiries, email hello@diarydock.com.",
            "Include the email address used for your DiaryDock account, but do not include passwords or highly sensitive document contents in your message."
          ]
        },
        {
          title: "Account and deletion requests",
          body: [
            "You can request account and data deletion from Settings inside DiaryDock or by visiting /account-deletion.",
            "Deletion requests are processed within 30 days after ownership of the account has been verified."
          ]
        },
        {
          title: "Important safety note",
          body: [
            "DiaryDock helps you organise household information. It does not provide legal, medical, financial, insurance, or emergency-services advice.",
            "If something is urgent or safety-critical, contact the relevant emergency service, professional adviser, insurer, healthcare provider, or official body directly."
          ]
        }
      ]}
    />
  );
}
