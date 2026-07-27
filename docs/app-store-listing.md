# LifeDock — App Store Connect listing draft

Copy/paste starting point for the App Store Connect listing. Review and adjust before submitting — nothing here has been legally reviewed.

## App information

- **Name** (30 char max): `LifeDock`
- **Subtitle** (30 char max): `Your family's digital home`
- **Bundle ID**: `com.lifedock.app`
- **Primary category**: Productivity
- **Secondary category**: Lifestyle
- **Support URL**: `https://www.thelifedock.com/settings` (or a dedicated support page if you make one)
- **Marketing URL**: `https://www.thelifedock.com`
- **Support email**: `support@thelifedock.com` (create this inbox before submitting — referenced in the in-app Privacy/Terms pages)

## Promotional text (170 char max, editable without review)

> Snap a photo, LifeDock files it. Bills, certificates, warranties and family documents — organised, reminded, and ready when you need them.

## Description

```
LifeDock keeps everything important in your family's life organised under one roof.

Snap a photo of a bill, certificate, or letter and LifeDock reads it, files it in the right room, and sets a reminder if it's due again. No more digging through drawers or email searches when you need a document in a hurry.

WHAT YOU CAN DO WITH LIFEDOCK
- Capture documents with your camera and let AI suggest the title, category, and filing room
- Browse your household by room — Kitchen, Vault, and more — instead of one long file list
- Get reminders before renewals, expiries, and due dates
- Invite family members and control exactly what they can see
- Set up Emergency Access Mode so the right documents are available in a crisis, without exposing everything else

PRIVATE BY DEFAULT
Every document is private until you choose to share it. You control who sees what, and Emergency Access Mode only ever shows the specific items you've approved.

LifeDock is built for the paperwork of real family life — insurance, warranties, school forms, medical letters, and more — so it's findable in seconds, not lost in a pile.
```

- **Keywords** (100 char max, comma-separated, no spaces needed): `documents,family organizer,household,estate,paperwork,scanner,reminders,vault,emergency`

## Age rating questionnaire

- No objectionable content (violence, mature themes, gambling, etc.) — answer "None" to all content categories.
- Expect an age rating of **4+**.

## App Privacy ("nutrition label") — data collection mapping

Fill this in via App Store Connect → App Privacy. Based on the current codebase (Supabase auth/storage + OpenAI document extraction):

| Data type | Collected? | Linked to identity? | Used for tracking? | Purpose |
|---|---|---|---|---|
| Email address | Yes | Yes | No | App functionality (account creation, login) |
| Photos or documents you upload | Yes | Yes | No | App functionality (document storage, AI extraction) |
| User content (notes, reminders, family/sharing settings) | Yes | Yes | No | App functionality |
| Identifiers (e.g. Supabase user ID) | Yes | Yes | No | App functionality |
| Usage data / diagnostics | Depends on hosting analytics — confirm if Vercel Analytics or similar is enabled | — | No | App performance |

None of the above should require "Data Used to Track You" (no ad tracking / no data broker sharing in the current app). Double-check this table against the actual final build before submitting — it's a legal declaration to Apple, not just marketing copy.

## Screenshots (required)

Apple requires screenshots for at minimum the 6.9" iPhone (e.g. iPhone 16 Pro Max) size; 6.5" and iPad sizes are optional but recommended if you support iPad. Existing marketing captures in `output/*.png` (qa-*, review-*, capture-source-*) are good source material but need to be re-captured as actual in-app screenshots at the correct device resolution — device-framed marketing renders are not accepted as App Store screenshots.

Suggested shot list (5–8 screens):
1. Dashboard / home view
2. Document capture in action
3. A room view (e.g. Vault or Kitchen)
4. Reminders board
5. Family sharing / invite screen
6. Emergency Access Mode

## Review notes for Apple

Provide a demo account (email + password) in the "App Review Information" section so Apple's reviewer can sign in — the app requires authentication before any content is visible.
