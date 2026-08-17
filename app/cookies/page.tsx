import type { Metadata } from "next";

import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Cookie Policy" };

export default function CookiePolicyPage() {
  return (
    <LegalPage
      eyebrow="Cookies"
      title="Cookie Policy"
      subtitle="How DiaryDock uses cookies and local storage."
      effectiveDate="17 August 2026"
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
            "If analytics or non-essential cookies are added later, DiaryDock should add a consent flow where required and update this policy before release."
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
