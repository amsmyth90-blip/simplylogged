import { parseFamilyStory } from "./parser.ts";
import type { AtticMutation } from "./types.ts";
import { exact, record, revision } from "./validation.ts";

export function parseAtticMutation(value: unknown): AtticMutation {
  const item = record(value, "Attic update");
  exact(item, ["operation", "revision", "story"], "Attic update");
  if (item.operation !== "ADD_STORY") {
    throw new Error("Attic update operation is invalid.");
  }
  return {
    operation: "ADD_STORY",
    revision: revision(item.revision),
    story: parseFamilyStory(item.story),
  };
}
