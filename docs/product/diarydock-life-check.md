# DiaryDock Life Check

Status: implemented.

Life Check is an editable applicability questionnaire at `/life-check`. It asks only whether major areas apply: home tenure, vehicles, pets, international travel, household collaboration, private document storage and reminders. Answers are stored in the signed-in user's private `app_state` row.

“No / not applicable” excludes an area from scoring; it never penalises the user. Unanswered questions affect only Life Check completion and produce a direct recommendation to finish the check. The interface uses calm language, large touch targets and progressive disclosure on phone and tablet.

Life Check does not make legal, financial, medical or safety judgements. It configures which deterministic organisation checks are relevant and remains editable as life changes.
