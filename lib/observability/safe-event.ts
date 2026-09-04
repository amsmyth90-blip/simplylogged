import { trace } from "@opentelemetry/api";

export type EventLevel = "error" | "info" | "warn";
export type EventValue = boolean | number | string | null | undefined;

const safeName = /^[a-z][A-Za-z0-9_.-]{0,79}$/;
const blockedField = /(access|authorization|body|content|cookie|cursor|email|file|message|name|payload|question|secret|token|user)/i;

function cleanFields(fields: Record<string, EventValue>) {
  const cleaned: Record<string, boolean | number | string | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!safeName.test(key) || blockedField.test(key) || value === undefined) continue;
    if (typeof value === "string") cleaned[key] = value.replace(/[\r\n\t]/g, " ").slice(0, 160);
    else if (typeof value === "number" && Number.isFinite(value)) cleaned[key] = value;
    else if (typeof value === "boolean" || value === null) cleaned[key] = value;
  }
  return cleaned;
}

export function emitServerEvent(
  level: EventLevel,
  event: string,
  fields: Record<string, EventValue> = {},
) {
  if (!safeName.test(event)) throw new Error("The observability event name is invalid.");
  const context = trace.getActiveSpan()?.spanContext();
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    service: "diarydock-web",
    ...(context?.traceId ? { traceId: context.traceId, spanId: context.spanId } : {}),
    ...cleanFields(fields),
  });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}
