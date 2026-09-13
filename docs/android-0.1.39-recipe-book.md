# Android 0.1.39: My recipe book

Adds My recipe book to the meal planner and meal editor. Users can search their
saved recipes by name or ingredient, filter scanned, added or saved online
recipes, and choose a recipe before reviewing servings and saving the meal.
The picker links to the existing recipe management screen and shows four
results per page. Searching cannot submit an old meal draft accidentally.

Based on the successful Android 0.1.38 build-two source, retaining its recipe
photo fix, recap settings and security updates. Version code 39.

Validation: all 598 current workspace tests passed; mobile TypeScript, scoped
lint (no errors), source-size check and mobile production bundle passed. Browser
checks covered source filters, search, pagination, selection, draft preservation,
save/reload and phone layout. Native device installation remains unverified.

Release changes are limited to the shared picker and its stylesheet, the mobile
planner and navigation integration, the Android version and this release note.
