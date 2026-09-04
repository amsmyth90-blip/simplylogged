import "server-only";

import {
  assertSyncCursorSecret,
  decodeSyncCursor,
  encodeSyncCursor,
} from "./cursor-codec";

export { decodeSyncCursor, encodeSyncCursor };

export function syncCursorSecret() {
  return assertSyncCursorSecret(process.env.DIARYDOCK_SYNC_CURSOR_SECRET ?? "");
}
