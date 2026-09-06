import { useState } from "react";

import type { KitchenCalendarCategory, KitchenCalendarEvent } from "@diarydock/kitchen";
import { MobileIcon } from "@mobile/components/MobileIcon";

import { calendarCategories } from "./calendar-model";

type Props = {
  busy: boolean;
  category: KitchenCalendarCategory;
  date: string;
  events: KitchenCalendarEvent[];
  onAdd: (title: string, time: string) => Promise<boolean>;
  onClose: () => void;
  onRemove: (event: KitchenCalendarEvent) => Promise<boolean>;
};

export function KitchenCalendarDialog(props: Props) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("09:00");
  const category = calendarCategories.find((item) => item.id === props.category)!;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (await props.onAdd(title, time)) setTitle("");
  }
  return <div className="calendar-overlay" role="presentation">
    <section className={`calendar-dialog is-${props.category}`} role="dialog" aria-modal="true"
      aria-labelledby="calendar-dialog-title">
      <header><span><MobileIcon name={category.icon} /></span><div><small>{props.date}</small>
        <h2 id="calendar-dialog-title">{category.label}</h2></div>
        <button type="button" onClick={props.onClose} aria-label="Close calendar events">×</button></header>
      <div className="calendar-event-list">
        {props.events.length ? props.events.map((event) => <article key={event.id}>
          <time>{event.time}</time><div><strong>{event.title}</strong>
            {event.assignedTo ? <small>{event.assignedTo}</small> : null}</div>
          <button type="button" disabled={props.busy}
            onClick={() => void props.onRemove(event)} aria-label={`Remove ${event.title}`}>×</button>
        </article>) : <p>No {category.label.toLowerCase()} planned for this day.</p>}
      </div>
      <form onSubmit={submit}><label>Event<input value={title} maxLength={160} required
        placeholder={`Add ${category.label.toLowerCase()}`}
        onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Time<input type="time" value={time} required
          onChange={(event) => setTime(event.target.value)} /></label>
        <button type="submit" disabled={props.busy}>Add to calendar</button></form>
    </section>
  </div>;
}
