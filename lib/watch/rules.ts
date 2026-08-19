import type { LifeEvent } from "@/lib/life-graph/types";

export type WatchInsight = {
  id: string;
  eventId: string;
  title: string;
  detail: string;
  urgency: "today" | "soon" | "upcoming" | "overdue";
  daysUntil: number;
  severity: LifeEvent["severity"];
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysUntil(dateIso: string, now = new Date()) {
  const target = startOfDay(new Date(dateIso));
  const today = startOfDay(now);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function createWatchInsight(event: LifeEvent, now = new Date()): WatchInsight | null {
  const remaining = daysUntil(event.startsAt, now);

  if (event.status === "completed" || event.status === "dismissed") {
    return null;
  }

  if (remaining < 0) {
    return {
      id: `watch:${event.id}`,
      eventId: event.id,
      title: event.title,
      detail: `${event.title} is overdue.`,
      urgency: "overdue",
      daysUntil: remaining,
      severity: "high"
    };
  }

  if (remaining === 0) {
    return {
      id: `watch:${event.id}`,
      eventId: event.id,
      title: event.title,
      detail: `${event.title} is due today.`,
      urgency: "today",
      daysUntil: remaining,
      severity: event.severity
    };
  }

  if (remaining <= 30) {
    return {
      id: `watch:${event.id}`,
      eventId: event.id,
      title: event.title,
      detail: `${event.title} is due in ${remaining} day${remaining === 1 ? "" : "s"}.`,
      urgency: "soon",
      daysUntil: remaining,
      severity: event.severity
    };
  }

  if (remaining <= 90) {
    return {
      id: `watch:${event.id}`,
      eventId: event.id,
      title: event.title,
      detail: `${event.title} is coming up in ${remaining} days.`,
      urgency: "upcoming",
      daysUntil: remaining,
      severity: event.severity
    };
  }

  return null;
}

export function createWatchInsights(events: LifeEvent[], now = new Date()) {
  return events
    .map((event) => createWatchInsight(event, now))
    .filter((insight): insight is WatchInsight => Boolean(insight))
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

