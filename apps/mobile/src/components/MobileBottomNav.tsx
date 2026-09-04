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

const destinations = [
  { id: "HOME" as const, icon: "⌂", label: "Home" },
  { id: "FILES" as const, icon: "▱", label: "All Files" },
];

export function MobileBottomNav(props: MobileBottomNavProps) {
  return (
    <nav
      className={`mobile-bottom-nav ${props.floating ? "is-floating" : ""}`}
      aria-label="Mobile navigation"
    >
      {destinations.map((item) => (
        <button
          key={item.id}
          type="button"
          className={props.active === item.id ? "is-active" : ""}
          aria-current={props.active === item.id ? "page" : undefined}
          onClick={() => props.onNavigate(item.id)}
        >
          <span>{item.icon}</span>{item.label}
        </button>
      ))}
      <button
        type="button"
        className={`scan-button ${props.active === "SCAN" ? "is-active" : ""}`}
        aria-current={props.active === "SCAN" ? "page" : undefined}
        onClick={() => props.onNavigate("SCAN")}
      >
        <span>＋</span>Scan
      </button>
      <button
        type="button"
        className={props.active === "REMINDERS" ? "is-active" : ""}
        aria-current={props.active === "REMINDERS" ? "page" : undefined}
        onClick={() => props.onNavigate("REMINDERS")}
      >
        <span>◷</span>Reminders
      </button>
      <button
        type="button"
        className={props.active === "FAMILY" ? "is-active" : ""}
        aria-current={props.active === "FAMILY" ? "page" : undefined}
        onClick={() => props.onNavigate("FAMILY")}
      ><span>♙</span>Family</button>
    </nav>
  );
}
