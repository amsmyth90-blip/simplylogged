# DiaryDock source standards

## Non-negotiable rules

- Handwritten source files contain no more than 300 physical lines.
- Executable product source has a 400-character hard line ceiling; ordinary code is wrapped substantially earlier.
- Generated files, dependency locks and provider-generated platform output are excluded.
- The source-size gate is strict: no handwritten source file is exempt from the limit.
- A file has one primary responsibility and one reason to change.
- Security and permission decisions are enforced at trusted boundaries, never only in UI state.
- Behavioural changes include tests at the narrowest useful level.
- The repository must pass type checking, linting, tests, source-size checks and production build.

## File design

Prefer small cohesive modules over regional helper collections.

- Domain types and rules are independent of frameworks.
- Use cases express product operations in product language.
- Adapters translate providers into application interfaces.
- UI components receive view data and emit user intent.
- Data loading and mutation orchestration live outside presentational components.
- Validation schemas sit at trust boundaries.
- Constants belong beside the rule they configure.
- Shared utilities require at least two genuine consumers.

Do not shorten a file through dense formatting, multiple statements per line or compressed JSX. The line limit exists to improve comprehension.

## Functions and components

- Functions do one operation at one abstraction level.
- Prefer early returns for invalid or unauthorised states.
- Avoid boolean arguments when a named policy or options object is clearer.
- React components do not contain provider queries, storage operations or permission algorithms.
- Complex screens are composed from sections, controllers and view-model hooks.
- Effects have an explicit external purpose and complete dependency lists.
- State has one authoritative owner.

## Naming and layout

- Product concepts use the same name in UI, contracts, database and tests.
- Files exporting a React component use PascalCase.
- Other TypeScript modules use lower-case kebab names.
- Tests use the subject name followed by `.test`.
- Provider-specific code lives in an adapter named for the provider.
- Avoid folders named `misc`, `common` or `helpers` without a product boundary.
- Index/barrel files are allowed only at package boundaries.

## TypeScript

- Strict TypeScript remains enabled.
- Avoid `any`; validate `unknown` before use.
- Export the smallest public surface.
- Prefer discriminated unions for state machines and result types.
- Do not use type assertions to bypass an unvalidated external payload.
- Server-only modules declare their boundary and never enter client bundles.
- Serialisable contracts contain no platform objects such as `File`, `Request` or Supabase clients.

## Errors and logging

- Public errors have stable codes and safe messages.
- Provider errors are mapped at the adapter boundary.
- Logs use structured fields and a correlation identifier.
- Never log passwords, session tokens, API keys, raw documents, private notes or encryption keys.
- Expected user errors are not reported as system failures.
- Retries require idempotency and a bounded policy.

## Security review points

Every externally reachable operation answers:

1. Who is the authenticated actor?
2. Which resource and tenant scope is authoritative?
3. What action is allowed for that actor?
4. Which fields are accepted and what are their bounds?
5. Is retry safe?
6. What is recorded for investigation without exposing content?
7. What happens when each dependency is unavailable?

Sensitive changes require server-side recent-authentication enforcement. Browser visibility and route guards are usability measures, not authorisation.

## Database changes

- Migrations are append-only after production use.
- Tables enable RLS before client grants are added.
- Policies state both visibility and mutation requirements.
- Security-definer functions set a safe search path and receive explicit grants.
- Owner identity is derived from authentication for client-callable functions.
- Foreign keys and uniqueness constraints protect invariants under concurrency.
- Indexes reflect real query prefixes and ordering.
- Large-table index changes use an operationally safe rollout.

## Tests

Use a balanced suite:

- pure unit tests for domain rules;
- contract tests for serialisation and API compatibility;
- integration tests for repositories and adapters;
- live RLS tests for tenant isolation;
- end-to-end tests for critical user journeys;
- visual comparisons for design parity;
- sync tests for retry, ordering, deletion and conflict behaviour;
- load and soak tests for capacity gates.

A security regression test accompanies every corrected vulnerability.

## Authorship quality

Source and documentation must read as a maintained product codebase:

- no meta-authoring commentary or generic filler;
- no speculative features presented as implemented;
- no unexplained abstractions or placeholder architecture;
- comments explain constraints and decisions, not obvious syntax;
- terminology, formatting and error language remain consistent;
- dead experiments and superseded implementations are removed through reviewed changes.

## Definition of done

A change is complete only when:

- its acceptance behaviour is implemented;
- boundaries and names match this standard;
- changed handwritten files are within the line limit;
- security and failure modes are tested;
- accessibility and responsive layouts are verified where applicable;
- migrations and rollback/forward recovery are documented;
- observability exists for production-critical work;
- all repository checks pass; and
- the relevant user-facing behaviour matches the approved product design.
