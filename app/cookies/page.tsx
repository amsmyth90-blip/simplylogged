import type { Metadata } from "next";

import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Cookie Policy" };

export default function CookiePolicyPage() {
  return (
    <LegalPage
      eyebrow="Cookies"
      title="Cookie Policy"
      subtitle="How DiaryDock uses cookies and local storage."
      effectiveDate="1 September 2026"
      sections={[
        {
          title: "Essential cookies",
          body: [
            "DiaryDock uses essential cookies to keep you signed in, maintain secure authentication sessions, and protect access to your private records.",
            "These cookies are necessary for DiaryDock to work and cannot be switched off inside the app."
          ]
        },
        {
          title: "Local storage",
          body: [
            "DiaryDock may store app preferences, draft state, and room choices in your browser or device storage so the app feels consistent while you use it.",
            "Local storage is not used for advertising or cross-site tracking."
          ]
        },
        {
          title: "Analytics and advertising",
          body: [
            "DiaryDock does not currently use advertising cookies, third-party marketing pixels, or cross-app tracking.",
            "Optional first-party product analytics is off by default and can be enabled or disabled from Product analytics in Settings. It does not use a cross-site identifier or advertising cookie. Turning it off deletes your stored product events.",
            "Opted-in events use your authenticated DiaryDock account only to deduplicate first-use events and honour deletion, and automatically expire after 90 days. Questions, document content, filenames, names, contact details, policy numbers, Vault material and security audit contents are not analytics properties."
          ]
        },
        {
          title: "Managing cookies",
          body: [
            "You can clear cookies and local storage through your browser or device settings. If you clear essential cookies, you may be signed out and need to log in again."
          ]
        }
      ]}
    />
  );
}
