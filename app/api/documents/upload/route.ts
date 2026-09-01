import { NextResponse } from "next/server";

// Kept temporarily so an outdated client receives a clear, non-retryable response.
// Current clients reserve quota and upload directly to the private quarantine bucket.
export async function POST() {
  return NextResponse.json(
    { error: "This upload method has been retired. Please refresh DiaryDock and choose the document again." },
    { status: 410 },
  );
}
