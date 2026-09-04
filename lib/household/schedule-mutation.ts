import type { HouseholdSchedulesMutation } from "@diarydock/household";

import { jsonUtf8Bytes } from "../serialization/json-size.ts";
import { scheduleObject } from "./schedule-payload.ts";

type Status = "CAPACITY" | "NOT_FOUND" | "OK";
type Result = { status: Status; payload?: Record<string, unknown> };

export function mutateHouseholdSchedulePayload(
  payload: unknown,
  mutation: HouseholdSchedulesMutation,
  createId = () => crypto.randomUUID(),
): Result {
  const root = scheduleObject(payload);
  const routines = Array.isArray(root.kidSchedules) ? [...root.kidSchedules] : [];

  if (mutation.operation === "DELETE_ROUTINE") {
    const next = routines.filter((entry) => scheduleObject(entry).id !== mutation.routineId);
    if (next.length === routines.length) return { status: "NOT_FOUND" };
    const result = { ...root, kidSchedules: next };
    return jsonUtf8Bytes(result) > 1_900_000
      ? { status: "CAPACITY" }
      : { status: "OK", payload: result };
  }

  if (mutation.routineId === null) {
    if (routines.length >= 300) return { status: "CAPACITY" };
    routines.push({ id: createId(), ...mutation.routine });
  } else {
    const index = routines.findIndex(
      (entry) => scheduleObject(entry).id === mutation.routineId,
    );
    if (index < 0) return { status: "NOT_FOUND" };
    routines[index] = {
      ...scheduleObject(routines[index]),
      id: mutation.routineId,
      ...mutation.routine,
    };
  }

  const result = { ...root, kidSchedules: routines };
  return jsonUtf8Bytes(result) > 1_900_000
    ? { status: "CAPACITY" }
    : { status: "OK", payload: result };
}
