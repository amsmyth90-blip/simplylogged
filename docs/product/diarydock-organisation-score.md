# DiaryDock Organisation Score

Status: implemented.

The Organisation Score is a deterministic 0–100 progress view, not a risk rating or AI opinion. It combines Life Check completion with explainable checks for the applicable essentials, home and money, documents, reminders, vehicles, pets, travel and household collaboration.

Each category shows completed and total checks. The overall value is a weighted average over applicable categories only. Every incomplete check maps to a concrete DiaryDock destination, so recommendations are actionable rather than generic.

The score is calculated from the user's currently authorised data and configuration. Analytics, when explicitly enabled, receives only one broad score band (`0_24`, `25_49`, `50_74` or `75_100`), never the answers or precise score.
