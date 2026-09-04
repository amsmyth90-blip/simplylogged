import { estateAreas } from "@diarydock/home";

import estateImage from "../../../../public/images/estate-dashboard-country.webp";
import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import "./home.css";

type HomeScreenProps = {
  firstName: string;
  reminderCount: number;
  syncStatus: string;
  visibleAreaIds?: readonly string[];
  onOpenReminders: () => void;
  onOpenArea: (areaId: string) => void;
  onNavigate: (destination: MobileDestination) => void;
  onSignOut: () => void;
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
  return (
    <main className="home-screen">
      <header className="home-overlay home-header">
        <div className="home-greeting">
          {greeting()}{props.firstName ? `, ${props.firstName}` : ""}
        </div>
        <div className="home-header-actions">
          <button type="button" onClick={() => props.onNavigate("SEARCH")} aria-label="Search DiaryDock">⌕</button>
          <button type="button" onClick={() => props.onNavigate("GUARDIAN")} aria-label="Open Guardian">♢</button>
          <button type="button" onClick={props.onSignOut} aria-label="Sign out">↪</button>
          <span className="home-ready">{props.syncStatus.toLowerCase().replaceAll("_", " ")}</span>
        </div>
      </header>

      {props.reminderCount ? (
        <button
          type="button"
          className="home-overlay home-today"
          onClick={props.onOpenReminders}
        >
          <span className="home-today-icon">✓</span>
          <span><strong>Today</strong><small>{props.reminderCount} action{props.reminderCount === 1 ? "" : "s"}</small></span>
        </button>
      ) : null}

      <button
        type="button"
        className="home-overlay home-emergency"
        onClick={() => props.onNavigate("EMERGENCY")}
      >
        <span>!</span> Emergency
      </button>

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
