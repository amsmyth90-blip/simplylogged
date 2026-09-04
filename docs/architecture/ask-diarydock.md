# Ask DiaryDock

Ask DiaryDock is a cited question-and-answer layer over the same authenticated retrieval boundary as universal search. It is not an autonomous agent and cannot create, edit, share or delete records.

## Permission and retrieval boundary

`POST /api/ask` authenticates the caller with the signed-in Supabase session. The shared search loader then queries `documents`, `reminders`, `assets` and the caller's exact `app_state` row. Database RLS and resource policies are applied before local question ranking. A service-role client is not used.

Only candidates already returned through that boundary can enter question retrieval. The local retriever extracts intent, domain hints and date horizons, ranks candidates, and caps the result at eight. A record that is absent from the authorised candidate set cannot be recovered or requested by the model.

## Minimal AI context

The model receives the user's question and, for each selected record, only an ephemeral source reference, category, title, short non-sensitive detail, relevant date and badge. It does not receive:

- the full DiaryDock or full `app_state` payload;
- database IDs, owner IDs or direct record routes;
- raw OCR, extraction text, notes, addresses, phone numbers or email;
- physical-link secrets, Vault content or permission rows;
- action tools.

Record fields are explicitly treated as untrusted data so embedded instructions cannot broaden retrieval or request actions. The OpenAI Responses API call uses strict JSON-schema output, `store: false`, a small output cap and no tools. The server maps returned source references back to the authorised direct links; the model never creates those links.

## Answers, citations and failure handling

Every data-backed answer must return at least one valid source reference. Unknown or invalid references are discarded. If no relevant authorised record exists, DiaryDock says so without calling the model. If the provider is unavailable or returns an unusable citation set, a deterministic cited summary is returned from the same selected records.

Questions are limited to 300 characters and the endpoint permits 20 requests per five minutes per signed-in account. Responses are private/no-store. Question or record plaintext is not written to application logs or analytics.
