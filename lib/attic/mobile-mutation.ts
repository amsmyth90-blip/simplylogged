import type { AtticMutation } from "@diarydock/attic";

type JsonRecord = Record<string, unknown>;
type MutationResult =
  | { status: "OK" | "IDEMPOTENT"; payload: JsonRecord }
  | { status: "CAPACITY" | "DUPLICATE"; payload: null };

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function sameStory(left: unknown, right: AtticMutation["story"]) {
  const item = object(left);
  return (
    item.id === right.id &&
    item.title === right.title &&
    item.storyText === right.storyText &&
    item.people === right.people &&
    item.place === right.place &&
    item.dateLabel === right.dateLabel &&
    JSON.stringify(item.tags) === JSON.stringify(right.tags) &&
    JSON.stringify(item.images) === JSON.stringify(right.images)
  );
}

export function mutateAtticPayload(
  current: unknown,
  mutation: AtticMutation,
): MutationResult {
  const payload = structuredClone(object(current));
  const stories = Array.isArray(payload.familyStories)
    ? [...payload.familyStories]
    : [];
  const existing = stories.find((entry) => object(entry).id === mutation.story.id);
  if (existing) {
    return sameStory(existing, mutation.story)
      ? { status: "IDEMPOTENT", payload }
      : { status: "DUPLICATE", payload: null };
  }
  if (stories.length >= 10_000) return { status: "CAPACITY", payload: null };
  payload.familyStories = [mutation.story, ...stories];
  const activity = object(payload.roomActivity);
  const atticActivity = Array.isArray(activity.attic) ? activity.attic : [];
  payload.roomActivity = {
    ...activity,
    attic: [
      {
        id: `family-story-${mutation.story.id}`,
        text: `Created family story "${mutation.story.title}" with ${mutation.story.images.length} photo${mutation.story.images.length === 1 ? "" : "s"}`,
        when: "Just now",
        by: "You",
      },
      ...atticActivity,
    ].slice(0, 500),
  };
  return { status: "OK", payload };
}
