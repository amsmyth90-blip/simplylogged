# Life Check and Organisation Score

DiaryDock's Organisation Score is a deterministic progress view, not a judgement, risk rating or AI opinion. It helps a person see which records they chose to organise and the next concrete step for each incomplete check.

## Applicability

Life Check extends the existing onboarding and remains editable at `/life-check`. It records explicit answers for home tenure, vehicles, pets, international travel, household collaboration, private document storage and reminders inside the user's existing owner-private `app_state` row. That row is protected by the database policy `id = auth.uid()`.

An answer of “No / not applicable” excludes the corresponding category and its weight. It does not create a zero category. Unanswered questions reduce only the Life Check completion portion and produce a direct recommendation to finish the check.

## Score registry

`lib/organisation-score.ts` is the configuration-driven registry. Each category declares:

- whether it applies from explicit Life Check answers;
- a category weight;
- deterministic checks over existing confirmed application records;
- a direct route and plain-language recommendation for each missing check.

The overall 0–100 score is the weighted average of the Life Check completion portion and applicable category scores. Category cards show completed and total checks so every point is explainable. The current adapters cover essentials, home and money, documents, reminders, vehicles, pets, travel and household collaboration.

## Safety and evolution

The score never changes records, enables sharing or turns on notifications. AI is not involved. New categories must declare applicability and must not penalise users for an area they marked as not applicable. Changes to checks or weights require boundary tests and a product-facing explanation before release.
