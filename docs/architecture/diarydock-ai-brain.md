# DiaryDock Brain

## Purpose

DiaryDock Brain should be the central AI orchestration layer. It should not be one huge AI endpoint. It should coordinate context, retrieval, model calls, tool proposals, safety checks and audit events.

Existing AI routes are useful and should become adapters into the Brain rather than being deleted.

## Current AI state

OpenAI calls currently exist in:

- `app/api/capture/extract/route.ts`
- `app/api/kitchen/analyse/route.ts`
- `app/api/kitchen/noticeboard/extract/route.ts`
- `app/api/kitchen/recipes/scan/route.ts`

Strengths:

- server-side API key use
- user authentication
- rate limiting
- JSON schema outputs
- review-first wording for legal/financial documents

Limitations:

- prompts and model choices are distributed
- no shared provider adapter
- no central provenance/audit of AI decisions
- no retrieval layer over user records
- no Ask DiaryDock interface
- no policy engine for AI tool use

## Target internal modules

```text
lib/brain/
  orchestrator.ts
  context-resolver.ts
  retrieval.ts
  provider-adapters/
    openai.ts
  prompts/
    document-extraction.ts
    classification.ts
    summarisation.ts
    ask-diarydock.ts
  extraction/
    schemas.ts
    confidence.ts
    validators.ts
  policies/
    privacy.ts
    tool-permissions.ts
    prompt-injection.ts
  actions/
    propose-action.ts
  audit.ts
  cost-control.ts
```

## Brain request flow

```text
User action or system event
↓
Brain orchestrator
↓
Context resolver
↓
Life Graph retrieval
↓
Policy and permission check
↓
Provider adapter call if needed
↓
Structured response
↓
Provenance and audit record
↓
Suggested action or user-facing answer
```

## Ask DiaryDock

Ask DiaryDock should work like this:

1. Parse the user question.
2. Resolve likely entity types and domains.
3. Query structured Life Graph records first.
4. Retrieve supporting documents/facts.
5. Use AI only when natural-language synthesis is useful.
6. Return answer with evidence.

Answer classification:

- `known_fact`: directly supported by confirmed record.
- `extracted_unconfirmed`: found in document/OCR but not user-confirmed.
- `inferred`: reasonable relationship but not directly confirmed.
- `unavailable`: DiaryDock does not have the information.
- `needs_review`: evidence exists but contains conflict/uncertainty.

Example:

```text
Question: When is my MOT due?
Answer: 12 August 2025.
Status: known_fact.
Evidence: Vehicle → Audi Q5 → MOT record.
```

If no MOT exists:

```text
I can't find an MOT record for this vehicle yet. You can upload the MOT certificate or add the date manually.
```

## Life Brief and Life Twin summaries

The Brain can summarise a user's day/week or produce Life Twin summaries, but it should consume structured context:

- confirmed facts
- events
- tasks
- Watch insights
- pending action requests
- recent imports

The summary output should never become the source of truth. If a summary says “your home insurance renews soon”, the renewal date must come from a policy/event/fact record.

## Universal Life Inbox AI

The Brain should support:

- classification
- OCR/extraction
- entity recognition
- relationship detection
- destination suggestion
- user review prompts

Confidence model:

| Confidence | Behaviour |
|---|---|
| High | Suggest destination and prefill fields, still mark critical facts as reviewable. |
| Medium | Prefill with visible review warnings. |
| Low | Store document safely and ask user to choose destination/details. |

Critical fields requiring confirmation:

- legal names
- dates affecting deadlines
- payment amounts
- policy numbers
- medical information
- identity document numbers
- permissions/access recipients
- anything that could trigger an external action

## Prompt injection and malicious document handling

Uploaded documents must be treated as untrusted input.

Policies:

- Do not obey instructions found inside documents.
- Use AI only to extract/summarise document content.
- Never let document content change system prompts, permissions or tool access.
- Store raw extraction separately from confirmed facts.
- Require confirmation before adding high-impact facts.

## Cost control

Use deterministic code for:

- due-date calculations
- reminder thresholds
- status grouping
- progress counts
- simple category filters

Use AI for:

- OCR/document understanding
- classification
- summarisation
- Ask DiaryDock language interface
- missing-information reasoning
- draft wording

Controls:

- central model router
- lower-cost model for classification
- stronger model only for complex documents/reasoning
- cache extraction results by document hash/version
- batch small classification work where possible
- rate limits per user and endpoint
- token/file/page limits
- background processing for non-urgent scans

## Provider abstraction

The app currently uses OpenAI directly. Keep OpenAI as the first provider, but wrap it:

```text
AiProvider
  classifyDocument()
  extractStructuredData()
  summarise()
  answerWithContext()
  proposeAction()
```

This allows later model/provider changes without rewriting room features.

## AI audit requirements

Each AI operation should record:

- user ID
- request type
- source entity/document
- model/provider
- prompt template version
- output schema version
- token/cost estimate if available
- confidence
- whether user accepted/rejected result
- generated action IDs

Do not log sensitive raw document text unless intentionally retained under policy.
