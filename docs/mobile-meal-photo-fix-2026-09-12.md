# Mobile recipe photos — Android 0.1.38

The installed app's planner used the default food strip even for linked recipes.
It now resolves the selected recipe by ID (or exact name for meals without an
ID) and displays that recipe's photo. Only recognised default dishes without a
linked recipe use the original thumbnails. Custom meals and unavailable photos
show a neutral leaf icon. A new image URL resets the error fallback.

Verification: mobile TypeScript and production bundle passed. Scoped ESLint
reported no errors (one existing warning for the decorative table image).
A 390×844 browser test exercised the actual mobile planner with isolated sample
data: two recipe selections, reload persistence, failed image, recovery with a
new image, missing photo, and clearing the day. All passed. This UI test uses a
local save stub and does not claim Android device or native sync verification.

Release versionCode is 38 and versionName is 0.1.38. The release is based on the
previously approved 0.1.37 source, retaining its recap and vault improvements.
