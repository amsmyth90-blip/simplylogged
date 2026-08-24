import type { Metadata } from "next";

import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      subtitle="How DiaryDock collects, uses, and protects your family's information."
      effectiveDate="17 August 2026"
      sections={[
        {
          title: "Who we are",
          body: [
            "DiaryDock is a household organisation app for securely storing and managing everyday life admin, family records, documents, reminders, and trusted-access information.",
            "For privacy questions, data export, or deletion requests, contact hello@diarydock.com."
          ]
        },
        {
          title: "Information we collect",
          body: [
            "Account information: your email address and authentication details, managed via our database provider, Supabase.",
            "Content you add: document titles, categories, room placement, reminders, notes, and the files or photos you upload. This may include sensitive household information such as wills, medical records, insurance paperwork, bills, identity documents, pet records, and family memories.",
            "Family and sharing settings: names or invite details for family members you add, the access level you grant them, and which documents you mark visible in Emergency Access Mode.",
            "Usage data such as device type and app version, collected automatically to keep the service running reliably and to diagnose problems."
          ]
        },
        {
          title: "Cookies and local storage",
          body: [
            "DiaryDock uses essential authentication cookies from Supabase to keep you signed in and protect your account session.",
            "DiaryDock also uses local browser storage for app preferences and draft state, such as household style choices and temporary room data.",
            "We do not currently use advertising cookies, cross-site tracking cookies, or third-party marketing pixels. If that changes, we will update this policy and request consent where required."
          ]
        },
        {
          title: "How we use your information",
          body: [
            "To store and organise your documents, show reminders, and route items to the correct room in your digital home.",
            "When you choose to use AI document, photo, recipe, noticeboard, bill, receipt, will, insurance, or kitchen reading, the file, photo, audio, or extracted text you provide is sent to our AI provider, OpenAI, solely to read it and suggest useful details. Under OpenAI's API terms, content submitted through the API is not used to train their models. AI results can be incomplete or wrong, so DiaryDock asks you to review important details before relying on them.",
            "To operate family sharing and Emergency Access Mode exactly as you configure them, and to respond to support requests.",
            "We do not sell your personal data, and we do not use your documents or photos for advertising."
          ]
        },
        {
          title: "Who we share data with",
          body: [
            "Supabase, for authentication, database, and file storage.",
            "OpenAI, for AI-based extraction and summarisation from files, photos, audio, and text that you explicitly submit for smart reading, as described above.",
            "Family members you explicitly invite, limited to the documents and access level you assign them.",
            "We do not share your data with any other third party except where required by law."
          ]
        },
        {
          title: "International processing",
          body: [
            "DiaryDock's service providers may process data in countries outside your own. Where required, we rely on appropriate safeguards offered by those providers for international transfers.",
            "Before public release, DiaryDock should confirm final hosting, storage, AI, and support processor regions and update this policy if needed."
          ]
        },
        {
          title: "Security",
          body: [
            "DiaryDock uses account authentication, database-level row security so accounts can only see their own records, and private file storage by default.",
            "Documents are private unless you choose to share them with an invited family member or mark them visible in Emergency Access Mode. Emergency Access Mode only ever shows the specific records you have approved for that purpose."
          ]
        },
        {
          title: "Data retention and your rights",
          body: [
            "We retain your account data and uploaded documents for as long as your account is active, unless a longer retention period is required by law or needed to resolve a dispute.",
            "You can request a copy of your data or request full account and data deletion at any time from Settings, at /account-deletion, or by emailing hello@diarydock.com.",
            "Deletion requests are processed within 30 days. Some information may remain briefly in encrypted backups before being permanently removed from normal backup rotation."
          ]
        },
        {
          title: "Children's privacy",
          body: [
            "DiaryDock is intended for adult household organisers and is not directed at children. We do not knowingly collect personal information from children under 13."
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
