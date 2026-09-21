import "server-only";

import {
  assertSyncCursorSecret,
  decodeSyncCursor,
  decodeSyncCursorSequence,
  encodeSyncCursor,
} from "./cursor-codec";

export { decodeSyncCursor, decodeSyncCursorSequence, encodeSyncCursor };

export function syncCursorSecret() {
  return assertSyncCursorSecret(process.env.DIARYDOCK_SYNC_CURSOR_SECRET ?? "");
}
