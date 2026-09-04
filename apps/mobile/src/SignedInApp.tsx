import { useCallback, useState } from "react";

import { roomProfiles } from "@diarydock/home";
import type { LifeCheckTarget } from "@diarydock/life-check";

import type { MobileDestination } from "@mobile/components/MobileBottomNav";
import { useNativeShareNavigation } from "@mobile/capture/native-share-import";
import { HomeScreen } from "@mobile/home/HomeScreen";
import { useHomeSummary } from "@mobile/home/use-home-summary";
import { useMobileOnboarding } from "@mobile/onboarding/use-mobile-onboarding";
import { shouldShowSetup } from "@mobile/onboarding/onboarding-model";
import {
  CaptureScreen,
  EmergencyScreen,
  FamilyScreen,
  FilesScreen,
  GuardianScreen,
  HouseholdInviteScreen,
  HomeHandoverScreen,
  KitchenNoticeboardScreen,
  KitchenPlanningScreen,
  KitchenScreen,
  LifeCheckScreen,
  OnboardingScreen,
  PhysicalLinksScreen,
  ReminderBoard,
  SearchScreen,
  SettingsScreen,
  TrustedAccessScreen,
} from "@mobile/signed-in-screens";
import { SignedInRoom } from "@mobile/SignedInRoom";
import { useBackgroundSync } from "@mobile/sync/use-background-sync";
import { signedInFirstName, type SignedInState } from "@mobile/signed-in-identity";

export function SignedInApp({
  state,
  onSignOut,
  inviteToken,
  onInviteHandled,
}: {
  state: SignedInState;
  onSignOut: () => Promise<void>;
  inviteToken: string | null;
  onInviteHandled: () => void;
}) {
  const sync = useBackgroundSync(state.store, state.session);
  const summary = useHomeSummary(state.store, sync.status);
  const onboarding = useMobileOnboarding({ accessToken: state.session.access_token,
    store: state.store, syncStatus: sync.status });
  const [destination, setDestination] = useState<MobileDestination>("HOME");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [captureRoom, setCaptureRoom] = useState<string | undefined>();
  const openSharedImport = useCallback(() => {
    setRoomId(null); setCaptureRoom(undefined); setDestination("SCAN");
  }, []);
  useNativeShareNavigation(openSharedImport);
  if (inviteToken) return <HouseholdInviteScreen accessToken={state.session.access_token}
    token={inviteToken} onClose={onInviteHandled}
    onAccepted={() => { onInviteHandled(); setDestination("FAMILY"); }} />;

  function navigate(next: MobileDestination) {
    if (next === "FAMILY") {
      setRoomId(null);
      setDestination(next);
      return;
    }
    setRoomId(null);
    if (next !== "SCAN") setCaptureRoom(undefined);
    setDestination(next);
  }

  function openRoom(nextRoomId: string) {
    if (nextRoomId !== "front-gate" && !roomProfiles[nextRoomId]) return;
    setRoomId(nextRoomId === "family-room" ? null : nextRoomId);
    setDestination(nextRoomId === "family-room" ? "FAMILY" : "HOME");
  }
  function openLifeCheckTarget(target: LifeCheckTarget) {
    const rooms: Partial<Record<LifeCheckTarget, string>> = { GARAGE: "garage", GARDEN: "garden",
      DRIVEWAY: "driveway", OFFICE: "office", MAILBOX: "mailbox", FRONT_GATE: "front-gate" };
    const room = rooms[target];
    if (room) { openRoom(room); return; }
    setDestination(target === "FILES" || target === "SCAN" || target === "REMINDERS"
      || target === "FAMILY" || target === "EMERGENCY" ? target : "HOME");
  }
  function scanInto(roomName: string) {
    setCaptureRoom(roomName);
    setRoomId(null);
    setDestination("SCAN");
  }

  function closeRoom() {
    setRoomId(null);
    setDestination("HOME");
  }

  async function signOutSafely() {
    const confirmed = window.confirm(
      "Signing out removes DiaryDock’s encrypted offline data from this device. Changes that have not synced will be lost. Continue?",
    );
    if (!confirmed) return;
    await sync.synchronize(); try { await onSignOut(); }
    catch { window.alert("DiaryDock could not finish secure sign-out. Please try again or close and reopen the app."); }
  }

  const editingSetup = destination === "ONBOARDING";
  const setupRequired = shouldShowSetup({ editing: editingSetup, loading: onboarding.loading,
    online: onboarding.online, snapshot: onboarding.snapshot });
  if (setupRequired)
    return (
      <OnboardingScreen model={onboarding}
        onBack={editingSetup && onboarding.snapshot?.completed
          ? () => { setRoomId("front-gate"); setDestination("HOME"); } : undefined}
        onComplete={() => setDestination("HOME")}
        onSignOut={() => void signOutSafely()} />
    );

  if (roomId === "front-gate")
    return (
      <SettingsScreen
        accessToken={state.session.access_token}
        user={state.session.user}
        syncStatus={sync.status}
        synchronize={sync.synchronize}
        onBack={closeRoom}
        onNavigate={navigate}
        onSignOut={() => void signOutSafely()}
      />
    );

  const profile = roomId ? roomProfiles[roomId] : undefined;
  if (profile)
    return (
      <SignedInRoom
        accessToken={state.session.access_token}
        profile={profile}
        store={state.store}
        syncStatus={sync.status}
        synchronize={sync.synchronize}
        onBack={closeRoom}
        onNavigate={navigate}
        onOpenKitchen={() => {
          setRoomId(null);
          setDestination("KITCHEN");
        }}
        onOpenSafeRoom={() => openRoom("safe-room")} onScan={scanInto}
      />
    );

  if (destination === "FILES")
    return (
      <FilesScreen
        accessToken={state.session.access_token}
        store={state.store}
        syncStatus={sync.status}
        synchronize={sync.synchronize}
        onNavigate={navigate}
      />
    );
  if (destination === "SEARCH")
    return (
      <SearchScreen
        accessToken={state.session.access_token}
        store={state.store}
        syncStatus={sync.status}
        onBack={() => setDestination("HOME")}
        onNavigate={navigate}
      />
    );
  if (destination === "GUARDIAN")
    return (
      <GuardianScreen
        accessToken={state.session.access_token}
        store={state.store}
        syncStatus={sync.status}
        onBack={() => setDestination("HOME")}
        onNavigate={navigate}
      />
    );
  if (destination === "EMERGENCY")
    return (
      <EmergencyScreen
        accessToken={state.session.access_token}
        store={state.store}
        syncStatus={sync.status}
        onBack={() => setDestination("HOME")}
        onTrustedAccess={() => setDestination("TRUSTED_ACCESS")}
      />
    );
  if (destination === "TRUSTED_ACCESS")
    return (
      <TrustedAccessScreen
        accessToken={state.session.access_token}
        onBack={() => setDestination("EMERGENCY")}
      />
    );
  if (destination === "PHYSICAL_LINKS")
    return (
      <PhysicalLinksScreen
        accessToken={state.session.access_token}
        store={state.store}
        syncStatus={sync.status}
        onBack={() => { setRoomId("front-gate"); setDestination("HOME"); }}
        onNavigate={navigate}
      />
    );
  if (destination === "LIFE_CHECK")
    return (
      <LifeCheckScreen accessToken={state.session.access_token} store={state.store}
        syncStatus={sync.status} onBack={() => { setRoomId("front-gate"); setDestination("HOME"); }}
        onNavigate={navigate} onOpenTarget={openLifeCheckTarget} />
    );
  if (destination === "HOME_HANDOVER")
    return (
      <HomeHandoverScreen accessToken={state.session.access_token} store={state.store}
        syncStatus={sync.status} onBack={() => { setRoomId("front-gate"); setDestination("HOME"); }}
        onNavigate={navigate} />
    );
  if (destination === "KITCHEN")
    return (
      <KitchenScreen
        accessToken={state.session.access_token}
        store={state.store}
        syncStatus={sync.status}
        onBack={() => { setRoomId("kitchen"); setDestination("HOME"); }}
        onNavigate={navigate}
        onOpenNoticeboard={() => setDestination("KITCHEN_NOTICES")}
        onOpenRecipes={() => setDestination("KITCHEN_RECIPES")}
        onOpenMealPlanner={() => setDestination("KITCHEN_MEALS")}
      />
    );
  if (destination === "KITCHEN_NOTICES")
    return (
      <KitchenNoticeboardScreen
        accessToken={state.session.access_token}
        store={state.store}
        syncStatus={sync.status}
        onBack={() => setDestination("KITCHEN")}
        onNavigate={navigate}
      />
    );
  if (destination === "KITCHEN_RECIPES" || destination === "KITCHEN_MEALS")
    return (
      <KitchenPlanningScreen
        accessToken={state.session.access_token}
        store={state.store}
        syncStatus={sync.status}
        initialView={destination === "KITCHEN_RECIPES" ? "RECIPES" : "MEALS"}
        onBack={() => setDestination("KITCHEN")}
        onNavigate={navigate}
      />
    );
  if (destination === "FAMILY")
    return (
      <FamilyScreen
        accessToken={state.session.access_token}
        store={state.store}
        syncStatus={sync.status}
        synchronize={sync.synchronize}
        onBack={() => setDestination("HOME")}
        onNavigate={navigate}
        onScan={scanInto}
      />
    );
  if (destination === "REMINDERS")
    return (
      <ReminderBoard
        store={state.store}
        syncStatus={sync.status}
        synchronize={sync.synchronize}
        onSignOut={signOutSafely}
        onNavigate={navigate}
      />
    );
  if (destination === "SCAN")
    return (
      <CaptureScreen
        accessToken={state.session.access_token}
        initialRoomName={captureRoom}
        store={state.store}
        syncStatus={sync.status}
        synchronize={sync.synchronize}
        onNavigate={navigate}
      />
    );

  return (
    <HomeScreen
      firstName={onboarding.snapshot?.profileName.split(/\s+/)[0] || signedInFirstName(state)}
      reminderCount={summary.reminderCount}
      syncStatus={sync.status}
      visibleAreaIds={onboarding.snapshot?.dashboardAreasConfigured
        ? onboarding.snapshot.selectedAreaIds : undefined}
      onOpenReminders={() => setDestination("REMINDERS")}
      onOpenArea={openRoom}
      onNavigate={navigate}
      onSignOut={() => void signOutSafely()}
    />
  );
}
