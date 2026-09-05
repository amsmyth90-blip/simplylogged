import { estateAreas } from "@diarydock/home";

import estateImage from "../../../../public/images/estate-dashboard-country.webp";
import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { MobileIcon } from "@mobile/components/MobileIcon";
import "./home.css";

type HomeScreenProps = {
  firstName: string;
  reminderCount: number;
  syncStatus: string;
  visibleAreaIds?: readonly string[];
  onOpenReminders: () => void;
  onOpenArea: (areaId: string) => void;
  onNavigate: (destination: MobileDestination) => void;
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeScreen(props: HomeScreenProps) {
  const visibleAreas = props.visibleAreaIds
    ? estateAreas.filter(({ id }) => props.visibleAreaIds!.includes(id)) : estateAreas;
  const status = props.syncStatus.toLowerCase().replaceAll("_", " ");
  const ready = props.syncStatus === "READY";
  return (
    <main className="home-screen">
      <header className="home-overlay home-header">
        <div className="home-greeting">
          {greeting()}{props.firstName ? `, ${props.firstName}` : ""}
        </div>
        <div className="home-header-actions">
          <button type="button" onClick={() => props.onNavigate("SEARCH")} aria-label="Search DiaryDock">
            <MobileIcon name="search" />
          </button>
          <button type="button" className="home-emergency" onClick={() => props.onNavigate("EMERGENCY")} aria-label="Emergency panel">
            <MobileIcon name="phone" />
          </button>
          <button type="button" className="home-ready" onClick={() => props.onNavigate("LIFE_CHECK")} aria-label={`DiaryDock status: ${status}`}>
            <span className={ready ? "status-dot is-ready" : "status-dot"} />
            <span className="ready-word">{ready ? "Ready" : status}</span>
            <strong>{ready ? "Synced" : "Check"}</strong>
          </button>
        </div>
      </header>

      <div className="home-overlay home-quick-row">
        {props.reminderCount ? (
          <button type="button" className="home-quick" onClick={props.onOpenReminders}>
            <span className="home-quick-icon is-today"><MobileIcon name="calendar" /></span>
            <span><strong>Today</strong><small>{props.reminderCount} action{props.reminderCount === 1 ? "" : "s"}</small></span>
          </button>
        ) : null}
        <button type="button" className="home-quick" onClick={() => props.onNavigate("GUARDIAN")}>
          <span className="home-quick-icon"><MobileIcon name="shield" /></span>
          <span><strong>Guardian</strong><small>Protection checks</small></span>
        </button>
      </div>

      <section className="estate-scene" aria-label="Your DiaryDock spaces">
        <div className="estate-canvas">
          <div
            className="estate-image"
            role="img"
            aria-label="DiaryDock digital home and its organised spaces"
            style={{ backgroundImage: `url(${estateImage})` }}
          />
          {visibleAreas.map((area) => (
            <button
              key={area.id}
              type="button"
              className={`estate-hotspot hotspot-${area.id}`}
              style={{ left: area.left, top: area.top }}
              aria-label={`${area.dashboardLabel ?? area.name} mobile workspace`}
              onClick={() => props.onOpenArea(area.id)}
            >
              <span>{area.dashboardLabel ?? area.name}</span>
            </button>
          ))}
        </div>
      </section>

      <MobileBottomNav active="HOME" floating onNavigate={props.onNavigate} />
    </main>
  );
}
