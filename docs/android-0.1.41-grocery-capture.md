# Grocery capture and shopping dates — Android 0.1.41

Based on Android 0.1.40 (422d4673304a09bc08c09acadc39997ec8b14ed9).
Version code 41. No database migration or server contract changes.

Grocery photo/video capture now uses an in-app camera with an in-memory buffer;
it does not launch an external camera or write to the gallery/filesystem.
Only bounded JPEG label frames are uploaded for reading. Raw video is discarded
after extracting frames. Frames are cleared after successful reading, choosing
again, or leaving the screen; failed reads keep frames temporarily for retry.
Existing photos/videos selected from the library are not deleted or changed.
Camera tracks stop on completion, cancellation, backgrounding and unmount.
Android CAMERA permission is declared, with camera hardware optional.

My groceries opens the product/date list first. Capture has separate ready,
reading, review and saved states. Review shows one product at a time. Search,
expiry filters, and pagination make saved groceries accessible. Pantry & shopping
and the meal planner's weekly shopping dialog show dates due within two days,
plus passed dates, with links to My groceries. Use-by and best-before remain distinct.
Used products are excluded. No grocery is automatically assumed safe for a recipe.

Validation: web/mobile TypeScript and production bundles passed. Source-size and
scoped lint passed (warnings only). Workspace suite: 602/603 initially; the old
shopping-navigation expectation was corrected, and all 10 tests in that suite
then passed. Date tests cover timezone boundaries, DST, used products and date types.
An isolated Chrome test with synthetic camera and mock products passed video and
photo capture, camera-track cleanup, read feedback, save/reload, filters, expiry
preview and used-up flows at 390px. It used no real camera, media or account records.
Actual phone capture still needs testing in the installed APK. Existing push
credentials remain required for delivered phone notifications; this update does
not configure them. No claim of physical device verification or delivered push.
