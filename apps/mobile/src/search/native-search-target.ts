import type { SearchResult } from "@diarydock/search";

import type { MobileDestination } from "@mobile/components/MobileBottomNav";

export type NativeSearchTarget =
  | { kind: "DESTINATION"; destination: MobileDestination }
  | { kind: "ROOM"; roomId: string };

const roomId = /^[a-z0-9-]{1,64}$/;

export function nativeTargetForSearchResult(result: SearchResult): NativeSearchTarget | null {
  if (!/^\/[A-Za-z0-9/_-]{1,299}$/.test(result.href) || result.href.includes("/../")) {
    return null;
  }
  const room = /^\/room\/([^/]+)$/.exec(result.href)?.[1];
  if (room && roomId.test(room)) return { kind: "ROOM", roomId: room };
  if (/^\/garage\/vehicles\/[A-Za-z0-9_-]{1,128}$/.test(result.href)) {
    return { kind: "ROOM", roomId: "garage" };
  }
  if (/^\/driveway\/trips\/[A-Za-z0-9_-]{1,128}$/.test(result.href)) {
    return { kind: "ROOM", roomId: "driveway" };
  }
  if (/^\/office\/(bills|insurance|contacts)\/[A-Za-z0-9_-]{1,128}$/.test(result.href)) {
    return { kind: "ROOM", roomId: "office" };
  }
  if (/^\/assets\/[A-Za-z0-9_-]{1,128}$/.test(result.href)) {
    return { kind: "DESTINATION", destination: "PHYSICAL_LINKS" };
  }
  if (result.href === "/reminders") {
    return { kind: "DESTINATION", destination: "REMINDERS" };
  }
  if (result.category === "vehicles") return { kind: "ROOM", roomId: "garage" };
  if (result.category === "travel") return { kind: "ROOM", roomId: "driveway" };
  if (result.category === "insurance" || result.category === "contacts") {
    return { kind: "ROOM", roomId: "office" };
  }
  if (result.category === "assets") {
    return { kind: "DESTINATION", destination: "PHYSICAL_LINKS" };
  }
  if (result.category === "pets") return { kind: "ROOM", roomId: "garden" };
  if (result.category === "home") return { kind: "DESTINATION", destination: "HOME" };
  return null;
}
