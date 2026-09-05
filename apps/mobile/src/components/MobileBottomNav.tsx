import { MobileIcon, type MobileIconName } from "./MobileIcon";

export type MobileDestination = "EMERGENCY" | "FAMILY" | "FILES" | "GUARDIAN" | "HOME"
  | "KITCHEN" | "KITCHEN_MEALS" | "KITCHEN_NOTICES" | "KITCHEN_RECIPES"
  | "HOME_HANDOVER" | "LIFE_CHECK" | "PHYSICAL_LINKS" | "REMINDERS" | "SCAN" | "SEARCH"
  | "ONBOARDING"
  | "TRUSTED_ACCESS";

type MobileBottomNavProps = {
  active: MobileDestination | null;
  floating?: boolean;
  onNavigate: (destination: MobileDestination) => void;
};

const destinations: ReadonlyArray<{
  id: MobileDestination;
  icon: MobileIconName;
  label: string;
}> = [
  { id: "HOME", icon: "home", label: "Home" },
  { id: "FILES", icon: "folder", label: "All Files" },
  { id: "SCAN", icon: "plus", label: "Scan" },
  { id: "REMINDERS", icon: "calendar", label: "Reminders" },
  { id: "FAMILY", icon: "users", label: "Family Room" },
];

export function MobileBottomNav(props: MobileBottomNavProps) {
  return (
    <nav
      className={`mobile-bottom-nav ${props.floating ? "is-floating" : ""}`}
      aria-label="Mobile navigation"
    >
      {destinations.map((item) => {
        const central = item.id === "SCAN";
        return (
          <button
            key={item.id}
            type="button"
            className={`${central ? "scan-button " : ""}${props.active === item.id ? "is-active" : ""}`}
            aria-current={props.active === item.id ? "page" : undefined}
            onClick={() => props.onNavigate(item.id)}
          >
            <span className="mobile-nav-icon"><MobileIcon name={item.icon} /></span>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
