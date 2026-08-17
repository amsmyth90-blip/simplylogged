# DiaryDock store compliance checklist

This is a practical release checklist for Apple App Store, TestFlight, Google Play internal testing, and Android APK review readiness. It is not legal advice.

## Public URLs

Use these URLs in App Store Connect and Google Play Console:

- Privacy Policy URL: `https://diarydock.com/privacy`
- Terms URL: `https://diarydock.com/terms`
- Cookie Policy URL: `https://diarydock.com/cookies`
- Support URL: `https://diarydock.com/support`
- Account deletion URL: `https://diarydock.com/account-deletion`

## Current app behaviour to declare

- Account required: yes.
- Authentication provider: Supabase.
- Private document/file storage: Supabase Storage.
- AI document/photo/text extraction: OpenAI API when the user submits content for smart reading.
- Advertising/tracking: none currently implemented.
- Non-essential marketing cookies: none currently implemented.
- Essential auth cookies/local storage: yes.
- User-generated content: documents, notes, reminders, household data, family stories, travel records, garden/garage/office records.
- Sensitive data may be stored by user choice: health, identity, wills, insurance, bills, emergency information.

## Apple App Store / TestFlight

- Add Privacy Policy URL: `https://diarydock.com/privacy`.
- Add Support URL: `https://diarydock.com/support`.
- Complete App Privacy nutrition labels accurately.
- Declare data collected and linked to identity where applicable.
- Do not declare tracking unless advertising identifiers, third-party ad networks, data brokers, or cross-app tracking are added.
- Provide reviewer demo account details if login is required.
- Include a working account deletion path in Settings and public instructions at `/account-deletion`.
- Complete export compliance, age rating, and beta app review contact details.

## Google Play

- Add Privacy Policy URL: `https://diarydock.com/privacy`.
- Add account deletion URL: `https://diarydock.com/account-deletion`.
- Complete the Data Safety form to match the final production behaviour.
- State that users can request deletion of account data and uploaded content.
- If releasing through Google Play instead of debug APK, create a signed release build and keep the upload key safe.

## Required operational follow-up before public launch

- Confirm `hello@diarydock.com` remains monitored. DNS currently routes DiaryDock email through Zoho Mail (`mx.zoho.eu`, SPF and Zoho verification present). A test message sent to `hello@diarydock.com` on 17 August 2026 arrived in Amy's monitored Outlook inbox.
- Add `SUPABASE_SERVICE_ROLE_KEY`, `ACCOUNT_DELETION_ADMIN_TOKEN` and `ACCOUNT_DELETION_ADMIN_EMAILS` to Vercel production environment variables.
- Apply the Supabase migration `20260817103000_account_deletion_requests.sql`.
- Review pending deletion requests in `public.account_deletion_requests` or the protected internal page at `/admin/account-deletion`.
- Process a verified request through the server-only endpoint:

```bash
curl -X POST https://diarydock.com/api/admin/account-deletion/process \
  -H "Authorization: Bearer $ACCOUNT_DELETION_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"requestId":"REQUEST_UUID"}'
```

- The processor removes the user's private storage folder, structured records, legacy records, private `app_state`, household invitation links, and the Supabase Auth user. Household-owner records are cascaded by Supabase foreign keys where configured.
- Confirm whether Vercel or any other hosting analytics are enabled. If analytics are added, update `/privacy`, `/cookies`, Apple App Privacy, and Google Play Data Safety.
- Have the final privacy policy, terms, and deletion wording reviewed before public launch.
