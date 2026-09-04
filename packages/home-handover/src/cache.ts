import { parseHomeHandoverSnapshot } from "./parser.ts";
import type { HomeHandoverSnapshot } from "./types.ts";

export function homeHandoverOwnerCache(snapshot: HomeHandoverSnapshot) {
  return parseHomeHandoverSnapshot({ ...snapshot, received: [] });
}
