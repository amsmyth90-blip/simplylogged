# DiaryDock Life OS Risk Register

## Architecture change register

| Change | Risk | Value | Launch urgency | Migration complexity | Notes |
|---|---|---|---|---|---|
| Add Life Graph entity and relationship tables | Medium | High | Now | Medium | Additive and essential for future AI. Do not remove current state yet. |
| Add provenance/facts model | Medium | High | Now | Medium | Needed so AI suggestions are not confused with confirmed records. |
| Add Life Inbox ingestion records | Medium | High | Now | Medium | Unifies scan, share sheet and email import. |
| Add central Brain provider adapter | Low | High | Now | Low | Wraps existing OpenAI calls without changing user flows. |
| Add action/permission/audit tables | Medium | High | Now | Medium | Critical before agentic functionality. |
| Refactor all room pages immediately | High | Low | Later | High | Avoid. Existing UI is valuable and working. |
| Move everything out of `app_state` immediately | High | Medium | Later | High | Use dual-write/backfill instead. |
| Build Ask DiaryDock before Life Graph | High | Medium | Later | Medium | Would increase hallucination and privacy risk. |
| Add external Agent Gateway now | High | Medium | Later | High | Premature until internal permissions/actions are mature. |
| Use graph database | High | Low | Later | High | Not needed now; Postgres can handle the first Life Graph. |
| Add deterministic Watch rules | Low | High | Now | Low | Strong pre-launch value without AI cost. |
| Add AI cost/router layer | Low | Medium | Soon | Low | Useful before heavy use; not a huge migration. |
| Add audit logs for document access/actions | Medium | High | Now | Medium | Important for trust and future compliance. |
| Add sensitivity tiers | Low | High | Now | Low | Can start simple and expand. |
| Harden CSP | Medium | Medium | Soon | Medium | Must be balanced with Next.js requirements. |
| Full autonomy settings UI | Medium | Medium | Later | Medium | Design now, expose gradually. |

## Product and security risks

| Risk | Severity | Why it matters | Mitigation |
|---|---|---|---|
| AI hallucinating personal facts | High | DiaryDock may contain legal, health and financial information. | Structured retrieval first; unavailable answer state; evidence attribution. |
| AI prompt injection from uploaded documents | High | A malicious document could instruct AI to ignore rules. | Treat document text as untrusted; central Brain safety policy. |
| Over-sharing sensitive records | High | Trusted access and future agents need strict scope. | Server-enforced permission grants, audit logs, sensitivity tiers. |
| JSON app state blocking granular permissions | Medium | Many records cannot be selectively queried/shared/deleted. | Gradual Life Graph migration with adapters. |
| Expensive AI usage | Medium | AI scans can become costly at scale. | Rate limits, caching, model routing, deterministic rules. |
| Duplicate import records | Medium | Email/webhook retries can create clutter. | Continue strengthening deterministic IDs and message/attachment dedupe. |
| Oversized workspace components | Medium | Slower changes, harder QA. | Extract services/components as touched. |
| Serverless limitations for Watch | Medium | Scheduled jobs and background processing need reliable execution. | Start with on-demand/event-derived rules; add cron/scheduled jobs only where needed. |

## Reuse estimate

For the target Life OS direction:

```text
Existing architecture reusable: 60%
Requires refactor: 25%
Requires new development: 15%
```

Reasoning:

- Reusable: room UI, authenticated routes, document storage, structured documents/reminders, household sharing foundation, mobile shell, inbound email, AI extraction schemas.
- Refactor: large feature workspaces, fragmented AI routes, JSON-heavy app state, duplicated upload/extraction flows.
- New development: Life Graph tables, Brain orchestration, action/permission/audit model, Watch event rules, Ask DiaryDock retrieval, future Agent Gateway.

## Go / No-Go recommendation

```text
GO WITH REFACTOR — targeted architectural work required first
```

DiaryDock does not need a major rewrite. The existing app is good enough to evolve. However, before public launch and before serious AI/agentic work, it should gain a small set of architectural foundations:

1. Life Graph seed tables.
2. Provenance/fact model.
3. Life Inbox pipeline.
4. Brain/provider abstraction.
5. Permission/action/audit model.
6. Basic deterministic Watch rules.

These changes are targeted and additive. They protect the long-term Life OS vision without derailing the product.

