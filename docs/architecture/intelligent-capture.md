# Intelligent Capture architecture

Date: 1 September 2026

## Consumer experience

DiaryDock keeps one simple boundary: it reads an uploaded page and shows “We found these details”; the user checks and confirms the result before an authoritative document or reminder is saved. Confidence changes the review guidance, never the confirmation requirement.

## Processing boundary

The current general capture path is:

1. authenticate and rate-limit the user;
2. enforce page-count and size limits;
3. compare the declared type with the file's binary signature;
4. run the configured replaceable security scanner;
5. create an owner-scoped durable capture job;
6. call the provider-neutral analysis interface;
7. store a minimal proposed-field summary with `userConfirmed=false`;
8. show the editable review screen;
9. save the private original and confirmed DiaryDock record;
10. mark the capture job confirmed against the saved document.

The original file bytes and OCR text are not stored in `capture_jobs`. Originals use the existing private document bucket. Provider errors are recorded using a generic failure code rather than document contents.

## File security

`lib/capture/file-security.ts` identifies PDF, JPEG, PNG, WebP and HEIC signatures and rejects disguised or unknown files before provider processing. `CaptureSecurityScanner` is a replaceable interface. The default implementation reports `UNAVAILABLE` because binary signature validation is not malware scanning. Set `DIARYDOCK_CAPTURE_SCANNER_REQUIRED=true` only after a real scanner adapter is configured; in that mode capture fails closed unless the scanner returns `PASSED`.

## Provider boundary

`CaptureAnalysisProvider` separates the route and business workflow from provider-specific transport. The current adapter uses OpenAI structured vision output. A replacement must preserve the schemas, page order, timeouts, error handling, and the rule that extracted values remain proposals.

## Durable states

`capture_jobs.status` supports `RECEIVED`, `VALIDATED`, `EXTRACTING`, `NEEDS_REVIEW`, `CONFIRMED`, `REJECTED`, and `FAILED`. The first production slice begins persistence at `EXTRACTING`, after local request validation succeeds. A future direct-to-storage quarantine flow can use the earlier states without changing the review contract.

`confirmed_document_id` is stored as text because deployed DiaryDock projects span legacy UUID and newer text document identifiers. The confirmation route verifies that the authenticated user owns the target document before recording the link.

## Deliberate limitations

- The built-in scanner is signature validation only and is not described as malware protection.
- The general capture UI prepares photographed pages as JPEG. PDF ingestion remains available to specialist document workflows and can be added to general capture after page rendering and ordering are verified.
- Specialist bill, policy, will and vehicle-receipt screens receive capture job identifiers but still need to record their final confirmation against their own structured records.
- Automatic appliance, MOT and pet-record proposals belong to the next Life Graph integration milestone.
