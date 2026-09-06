import { useState } from "react";

import type { KitchenCalendarCategory, KitchenCalendarEvent,
  KitchenCalendarSnapshot } from "@diarydock/kitchen";
import type { OfflineStore } from "@diarydock/offline-store";

import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { MobileIcon } from "@mobile/components/MobileIcon";
import { KitchenCalendarDialog } from "./KitchenCalendarDialog";
import { calendarCategories, calendarCells, calendarDateKey } from "./calendar-model";
import { useKitchenCalendar } from "./use-kitchen-calendar";
import "./calendar.css";

type Props = {
  accessToken: string;
  disableOnline?: boolean;
  initialSnapshot?: KitchenCalendarSnapshot;
  store: OfflineStore;
  syncStatus: string;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
};

export function KitchenCalendarScreen(props: Props) {
  const calendar = useKitchenCalendar(props);
  const now = new Date();
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState(now.getDate());
  const [activeCategory, setActiveCategory] = useState<KitchenCalendarCategory | null>(null);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const key = calendarDateKey(year, month, selected);
  const events = calendar.snapshot?.events ?? [];
  const dayEvents = events.filter((event) => event.date === key);
  const cells = calendarCells(year, month);

  function changeMonth(change: number) {
    setCursor(new Date(year, month + change, 1)); setSelected(1); setActiveCategory(null);
  }
  async function add(title: string, time: string) {
    if (!activeCategory) return false;
    return calendar.mutate({ operation: "SAVE_EVENT", eventId: null,
      event: { title: title.trim(), date: key, time, category: activeCategory } });
  }
  async function remove(event: KitchenCalendarEvent) {
    if (!window.confirm(`Remove ${event.title} from the calendar?`)) return false;
    return calendar.mutate({ operation: "DELETE_EVENT", eventId: event.id });
  }

  return <main className="kitchen-calendar-screen">
    <div className="kitchen-calendar-shell">
      <header className="kitchen-calendar-header">
        <button type="button" onClick={props.onBack} aria-label="Back to Kitchen">
          <MobileIcon name="arrow-left" /></button>
        <div><small>Kitchen · Wall calendar</small><h1>Family calendar</h1>
          <p>Appointments, school dates, meals and family plans.</p></div>
        <span className={calendar.online ? "is-online" : "is-offline"}>
          {calendar.online ? "Synced" : "Offline"}</span>
      </header>
      <section className="calendar-month">
        <header><button type="button" onClick={() => changeMonth(-1)}
          aria-label="Previous month">‹</button><h2>{cursor.toLocaleDateString("en-GB",
            { month: "long", year: "numeric" })}</h2>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">›</button></header>
        <div className="calendar-weekdays">{["S", "M", "T", "W", "T", "F", "S"]
          .map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
        <div className="calendar-grid">{cells.map((day, index) => day ? <button
          type="button" key={`${day}-${index}`} className={selected === day ? "is-selected" : ""}
          onClick={() => { setSelected(day); setActiveCategory(null); }}>{day}
          {events.some((event) => event.date === calendarDateKey(year, month, day))
            ? <span /> : null}</button> : <i key={`empty-${index}`} />)}</div>
      </section>
      <section className="calendar-categories">{calendarCategories.map((category) => {
        const actual = dayEvents.filter((event) => event.category === category.id);
        const preview = actual.length ? actual : category.examples;
        return <button type="button" className={`calendar-category is-${category.id}`}
          key={category.id} onClick={() => setActiveCategory(category.id)}>
          <header><span><MobileIcon name={category.icon} /></span><strong>{category.label}</strong>
            <b>›</b></header><div>{preview.slice(0, 2).map((event, index) => <p
              key={`${event.title}-${index}`}><span>{event.title}</span><time>{event.time}</time></p>)}</div>
          <small>{actual.length ? `${actual.length} planned` : `View all for ${selected}`}</small>
        </button>;
      })}</section>
      {calendar.loading && !calendar.snapshot ? <p className="calendar-status">Opening securely…</p>
        : calendar.message ? <p className="calendar-status" role="status">{calendar.message}</p> : null}
    </div>
    {activeCategory ? <KitchenCalendarDialog busy={calendar.busy} category={activeCategory}
      date={new Date(year, month, selected).toLocaleDateString("en-GB",
        { weekday: "long", day: "numeric", month: "long" })}
      events={dayEvents.filter((event) => event.category === activeCategory)}
      onAdd={add} onClose={() => setActiveCategory(null)} onRemove={remove} /> : null}
    <MobileBottomNav active="HOME" onNavigate={props.onNavigate} />
  </main>;
}
