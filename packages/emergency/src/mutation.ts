import type { EmergencyMutation } from "./types.ts";
import { array, exact, optionalText, record, text } from "./parser-helpers.ts";

function revision(value: unknown) {
  if (value === null) return null;
  const parsed = text(value, "Emergency revision", 40);
  if (!Number.isFinite(Date.parse(parsed))) throw new Error("Emergency revision is invalid.");
  return parsed;
}

export function parseEmergencyMutation(value: unknown): EmergencyMutation {
  const item = record(value, "Emergency update");
  const operation = text(item.operation, "Emergency operation", 40);
  if (operation === "ADD_CONTACT") {
    exact(item, ["operation", "revision", "name", "relation", "phone", "note"], "Emergency update");
    return {
      operation,
      revision: revision(item.revision),
      name: text(item.name, "Emergency contact name", 120),
      relation: text(item.relation, "Emergency contact relationship", 120),
      phone: text(item.phone, "Emergency contact phone", 40),
      note: optionalText(item.note, "Emergency contact note", 300),
    };
  }
  if (operation === "ADD_PLAN") {
    exact(item, ["operation", "revision", "title", "summary", "steps"], "Emergency update");
    const steps = array(item.steps, "Emergency plan steps", 20)
      .map((step) => text(step, "Emergency plan step", 500));
    if (!steps.length) throw new Error("Emergency plan steps are invalid.");
    return {
      operation,
      revision: revision(item.revision),
      title: text(item.title, "Emergency plan title", 160),
      summary: text(item.summary, "Emergency plan summary", 400),
      steps,
    };
  }
  if (operation === "ADD_HOME_INFO") {
    exact(item, ["operation", "revision", "label", "value"], "Emergency update");
    return {
      operation,
      revision: revision(item.revision),
      label: text(item.label, "Emergency information label", 120),
      value: text(item.value, "Emergency information value", 500),
    };
  }
  throw new Error("Emergency operation is invalid.");
}
