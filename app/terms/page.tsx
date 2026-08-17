import type { Metadata } from "next";

import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of Use"
      subtitle="The terms that apply when you use DiaryDock."
      effectiveDate="17 August 2026"
      sections={[
        {
          title: "Acceptance of terms",
          body: [
            "By creating a DiaryDock account or using the app, you agree to these Terms of Use and our Privacy Policy. If you do not agree, please do not use DiaryDock."
          ]
        },
        {
          title: "Your account and responsibilities",
          body: [
            "You are responsible for keeping your login credentials secure and for the accuracy of the information you add to your account.",
            "You must be at least 18 years old, or the age of majority in your jurisdiction, to create a DiaryDock account."
          ]
        },
        {
          title: "Document uploads and AI extraction",
          body: [
            "When you upload or record content for AI reading, DiaryDock may send that content to its AI provider so it can extract useful text, summaries, reminders, and filing details. Results may occasionally be incomplete or incorrect.",
            "You are responsible for reviewing AI-suggested text, categories, dates, and reminders before relying on them, and for keeping original copies of important documents.",
            "DiaryDock organises information but does not provide legal, financial, medical, insurance, or emergency-services advice, and should not be relied on as the sole record of critical documents."
          ]
        },
        {
          title: "Your content",
          body: [
            "You retain ownership of the documents, photos, and information you upload to DiaryDock. You grant us a limited licence to store and process that content solely to provide the service to you.",
            "You are responsible for having the right to upload any document or photo you add, and for not uploading content that is unlawful or infringes on someone else's rights."
          ]
        },
        {
          title: "Family sharing and Emergency Access Mode",
          body: [
            "You control which family members you invite and what access level and emergency visibility each document has. Please review sharing settings carefully before granting access.",
            "DiaryDock is designed to keep information private by default, but you are responsible for the sharing choices you make within the app."
          ]
        },
        {
          title: "Termination",
          body: [
            "You may stop using DiaryDock and request account deletion at any time via Settings, /account-deletion, or by contacting support. We may suspend or terminate accounts that violate these terms or misuse the service."
          ]
        },
        {
          title: "Disclaimer and limitation of liability",
          body: [
            "DiaryDock is provided \"as is\" without warranties of any kind. To the fullest extent permitted by law, DiaryDock is not liable for indirect, incidental, or consequential damages arising from your use of the app, including reliance on AI-extracted information.",
            "Nothing in these terms limits liability that cannot lawfully be excluded, such as liability for fraud."
          ]
        },
        {
          title: "Governing law",
          body: [
            "These terms are governed by the laws of Northern Ireland. If you use DiaryDock as a consumer in another country, you keep any mandatory consumer protections that the laws of your country provide."
          ]
        },
        {
          title: "Changes to these terms",
          body: [
            "We may update these terms from time to time. If we make material changes, we will update the effective date above and, where appropriate, notify you in the app."
          ]
        }
      ]}
    />
  );
}
