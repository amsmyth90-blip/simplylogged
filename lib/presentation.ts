import type { VaultDocument } from "@/lib/mock-data";

const MILLISECONDS_PER_DAY = 86_400_000;

export function dateTime(value: string, time = "12:00:00") {
  return value
    ? new Date(`${value}T${time}`).getTime()
    : Number.POSITIVE_INFINITY;
}

export function daysUntil(value: string, time = "12:00:00") {
  return value
    ? Math.ceil((dateTime(value, time) - Date.now()) / MILLISECONDS_PER_DAY)
    : Number.POSITIVE_INFINITY;
}

export function formatDate(
  value: string,
  day: "numeric" | "2-digit" = "numeric",
) {
  if (!value) return "Not recorded";

  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
        day,
        month: "short",
        year: "numeric",
      }).format(date);
}

export function formatFileSize(bytes: number) {
  return bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function documentKind(file: File): VaultDocument["kind"] {
  return file.type === "application/pdf" ? "PDF" : "Image";
}
