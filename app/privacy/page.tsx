import type { Metadata } from "next";

import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      subtitle="How LifeDock collects, uses, and protects your family's information."
      effectiveDate="27 July 2026"
      sections={[
        {
          title: "Information we collect",
          body: [
            "Account information: your email address and authentication details, managed via our database provider, Supabase.",
            "Content you add: document titles, categories, room placement, reminders, notes, and the files or photos you upload (for example bills, certificates, and insurance paperwork).",
            "Family and sharing settings: names or invite details for family members you add, the access level you grant them, and which documents you mark visible in Emergency Access Mode.",
            "Usage data such as device type and app version, collected automatically to keep the service running reliably and to diagnose problems."
          ]
        },
        {
          title: "How we use your information",
          body: [
            "To store and organise your documents, show reminders, and route items to the correct room in your digital home.",
            "When you use AI document reading, the photo or file you upload is sent to our AI provider, OpenAI, solely to extract text and suggest filing details (title, category, dates). Under OpenAI's API terms, content submitted through the API is not used to train their models. The extracted result is only saved to your account after you confirm it.",
            "To operate family sharing and Emergency Access Mode exactly as you configure them, and to respond to support requests.",
            "We do not sell your personal data, and we do not use your documents or photos for advertising."
          ]
        },
        {
          title: "Who we share data with",
          body: [
            "Supabase, for authentication, database, and file storage.",
            "OpenAI, for AI-based text extraction from uploaded documents and photos, as described above.",
            "Family members you explicitly invite, limited to the documents and access level you assign them.",
            "We do not share your data with any other third party except where required by law."
          ]
        },
        {
          title: "Security",
          body: [
            "LifeDock uses account authentication, database-level row security so accounts can only see their own records, and private file storage by default.",
            "Documents are private unless you choose to share them with an invited family member or mark them visible in Emergency Access Mode. Emergency Access Mode only ever shows the specific records you have approved for that purpose."
          ]
        },
        {
          title: "Data retention and your rights",
          body: [
            "We retain your account data and uploaded documents for as long as your account is active. You can request a copy of your data or request full account and data deletion at any time.",
            "Deletion requests are processed within 30 days. Some information may be retained briefly in backups before being permanently removed."
          ]
        },
        {
          title: "Children's privacy",
          body: [
            "LifeDock is intended for adult household organisers and is not directed at children. We do not knowingly collect personal information from children under 13."
          ]
        },
        {
          title: "Changes to this policy",
          body: [
            "If we make material changes to this policy, we will update the effective date above and, where appropriate, notify you in the app."
          ]
        }
      ]}
    />
  );
}
