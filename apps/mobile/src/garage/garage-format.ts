export function garageDate(value: string) {
  if (!value) return "Not recorded";
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? "Not recorded"
    : new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(parsed);
}

export function garageMoney(value: number | null) {
  if (value === null) return "Not recorded";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(value);
}

export function garageMileage(value: number | null) {
  return value === null
    ? "Not recorded"
    : `${value.toLocaleString("en-GB")} miles`;
}

export function dateStatus(value: string) {
  if (!value) return "missing";
  const days =
    (new Date(`${value}T12:00:00`).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return "overdue";
  if (days <= 30) return "soon";
  return "current";
}
