import { HomeScreen } from "@mobile/home/HomeScreen";

export function HomePreview() {
  return (
    <HomeScreen
      firstName="Amy"
      reminderCount={3}
      syncStatus="READY"
      onOpenArea={() => undefined}
      onOpenReminders={() => undefined}
      onNavigate={() => undefined}
      onSignOut={() => undefined}
    />
  );
}
