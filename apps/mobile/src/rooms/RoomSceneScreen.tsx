import type { RoomProfile } from "@diarydock/home";

import { MobileBottomNav, type MobileDestination } from "@mobile/components/MobileBottomNav";
import { roomScenes, type RoomSceneAction } from "./room-scene-config";

type Props = {
  profile: RoomProfile;
  syncStatus: string;
  onBack: () => void;
  onNavigate: (destination: MobileDestination) => void;
  onOpen: (action: RoomSceneAction) => void;
};

export function RoomSceneScreen(props: Props) {
  const scene = roomScenes[props.profile.id];
  if (!scene) return null;

  return (
    <main className="native-room-scene" style={{ backgroundColor: scene.tone }}>
      <div
        className="native-room-backdrop"
        aria-hidden="true"
        style={{ backgroundImage: `url(${scene.image})` }}
      />
      <section className="native-room-frame" aria-label={`Interactive ${scene.name}`}>
        <img className="native-room-image" src={scene.image} alt={scene.imageAlt} />
        <div className="native-room-top-shade" aria-hidden="true" />
        <div className="native-room-bottom-shade" aria-hidden="true" />
        <nav className="native-room-actions" aria-label={`${scene.name} sections`}>
          {scene.actions.map((item, index) => (
            <button
              type="button"
              key={`${item.id}-${index}`}
              className="native-room-label"
              style={{ left: item.left, top: item.top }}
              aria-label={`Open ${item.label}: ${item.description}`}
              onClick={() => props.onOpen(item)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </section>
      <header className="native-room-header">
        <button type="button" onClick={props.onBack} aria-label="Back to the estate map">‹</button>
        <div><small>{scene.eyebrow}</small><strong>{scene.name}</strong></div>
        <span className={`sync-pill sync-${props.syncStatus.toLowerCase()}`}>
          {props.syncStatus.toLowerCase().replaceAll("_", " ")}
        </span>
      </header>
      <MobileBottomNav active={props.profile.id === "family-room" ? "FAMILY" : "HOME"}
        floating onNavigate={props.onNavigate} />
    </main>
  );
}
