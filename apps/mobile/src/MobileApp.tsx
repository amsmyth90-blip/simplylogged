import { Suspense } from "react";

import { LoginScreen } from "@mobile/auth/LoginScreen";
import { useMobileSession } from "@mobile/auth/use-mobile-session";
import { SignedInApp } from "@mobile/SignedInApp";
import { useHouseholdInviteLink } from "@mobile/family/use-household-invite-link";

export function MobileApp() {
  const { state, signIn, signInError, signOut } = useMobileSession();
  const invite = useHouseholdInviteLink();

  if (state.status === "LOADING") {
    return (
      <main className="mobile-shell">
        <p>Opening DiaryDock securely…</p>
      </main>
    );
  }
  if (state.status === "CONFIGURATION_ERROR") {
    return (
      <main className="mobile-shell">
        <p className="form-message form-error" role="alert">
          {state.message}
        </p>
      </main>
    );
  }
  if (state.status === "SIGNED_OUT") {
    return <LoginScreen error={signInError} onSignIn={signIn} />;
  }
  return (
    <Suspense
      fallback={
        <main className="mobile-shell">
          <p>Opening this space securely…</p>
        </main>
      }
    >
      <SignedInApp key={state.session.user.id} state={state} onSignOut={signOut}
        inviteToken={invite.token} onInviteHandled={invite.clear} />
    </Suspense>
  );
}
