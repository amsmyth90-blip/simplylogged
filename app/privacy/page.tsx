import type { Metadata } from "next";

import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy" };

function paragraph(...parts: string[]) {
  return parts.join(" ");
}

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      subtitle="How DiaryDock collects, uses, and protects your family's information."
      effectiveDate="1 September 2026"
      sections={[
        {
          title: "Who we are",
          body: [
            "DiaryDock is a household organisation app for securely storing and managing everyday life admin, family records, documents, reminders, and trusted-access information.",
            "For privacy questions, data export, or deletion requests, contact hello@diarydock.com.",
          ],
        },
        {
          title: "Information we collect",
          body: [
            "Account information: your email address and authentication details, managed via our database provider, Supabase.",
            "Content you add: document titles, categories, room placement, reminders, notes, and the files or photos you upload. This may include sensitive household information such as wills, medical records, insurance paperwork, bills, identity documents, pet records, and family memories.",
            "Family and sharing settings: names or invite details for family members you add, the access level you grant them, and which documents you mark visible in Emergency Access Mode.",
            "Essential request and diagnostic data needed to keep the service secure and reliable. Optional product-usage events are collected only after you switch on Product analytics in Settings.",
          ],
        },
        {
          title: "Cookies and local storage",
          body: [
            "DiaryDock uses essential authentication cookies from Supabase to keep you signed in and protect your account session.",
            "DiaryDock also uses local browser storage for app preferences and draft state, such as household style choices and temporary room data.",
            "We do not use advertising cookies, cross-site tracking cookies, or third-party marketing pixels. Optional first-party product analytics is off by default and controlled from Settings.",
          ],
        },
        {
          title: "How we use your information",
          body: [
            "To store and organise your documents, show reminders, and route items to the correct room in your digital home.",
            paragraph(
              "When you choose to use AI document, photo, recipe, noticeboard, bill, receipt,",
              "will, insurance, kitchen reading, or Ask DiaryDock, the content you submit is sent",
              "to our AI provider, OpenAI, solely to provide that feature. Ask DiaryDock sends your",
              "question with no more than eight relevant, stripped-down record summaries; it does",
              "not send your full account, raw documents, private notes, or contact details. Under",
              "OpenAI's API terms, content submitted through the API is not used to train their",
              "models. AI results can be incomplete or wrong, so DiaryDock asks you to check linked",
              "records before relying on important details.",
            ),
            "To operate family sharing and trusted Emergency Access exactly as you configure them, including checking that an invitation is accepted by the email address you selected, and to respond to support requests.",
            paragraph(
              "If you opt in to Product analytics, to understand setup, first useful actions,",
              "return use and broad subscription tier using a fixed event list. Analytics never",
              "includes your questions, document titles or contents, filenames, notes, contact",
              "details, policy numbers, Vault material or security audit contents.",
            ),
            "We do not sell your personal data, and we do not use your documents or photos for advertising.",
          ],
        },
        {
          title: "Who we share data with",
          body: [
            "Supabase, for authentication, database, and file storage.",
            "OpenAI, for AI-based extraction, summarisation, and cited answers from files, photos, audio, text, and questions that you explicitly submit, as described above.",
            "Family members you explicitly invite, limited to the documents and access level you assign them.",
            "We do not share your data with any other third party except where required by law.",
          ],
        },
        {
          title: "International processing",
          body: [
            "DiaryDock's service providers may process data in countries outside your own. Where required, we rely on appropriate safeguards offered by those providers for international transfers.",
            "Before public release, DiaryDock should confirm final hosting, storage, AI, and support processor regions and update this policy if needed.",
          ],
        },
        {
          title: "Security",
          body: [
            "DiaryDock uses account authentication, database-level row security so people can see only records they own or that have been explicitly shared with them, and private file storage by default.",
            "Documents are private unless you choose to share them with an invited family member or explicitly grant a trusted person emergency access. Trusted Emergency Access only shows the individual records you selected, is read-only, and can be revoked.",
          ],
        },
        {
          title: "Data retention and your rights",
          body: [
            "We retain your account data and uploaded documents for as long as your account is active, unless a longer retention period is required by law or needed to resolve a dispute.",
            "Opted-in product analytics events expire automatically after 90 days. Switching analytics off deletes your stored product events immediately; account deletion also removes them.",
            "You can request a copy of your data or request full account and data deletion at any time from Settings, at /account-deletion, or by emailing hello@diarydock.com.",
            "Deletion requests are processed within 30 days. Some information may remain briefly in encrypted backups before being permanently removed from normal backup rotation.",
          ],
        },
        {
          title: "Children's privacy",
          body: [
            "DiaryDock is intended for adult household organisers and is not directed at children. We do not knowingly collect personal information from children under 13.",
          ],
        },
        {
          title: "Changes to this policy",
          body: [
            "If we make material changes to this policy, we will update the effective date above and, where appropriate, notify you in the app.",
          ],
        },
      ]}
    />
  );
}
