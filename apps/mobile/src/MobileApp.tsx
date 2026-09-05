import { Suspense } from "react";

import { ResetPasswordScreen } from "@mobile/auth/ResetPasswordScreen";
import { OfflineStorageErrorScreen } from "@mobile/auth/OfflineStorageErrorScreen";
import { SignedOutApp } from "@mobile/auth/SignedOutApp";
import { useMobileSession } from "@mobile/auth/use-mobile-session";
import { SignedInApp } from "@mobile/SignedInApp";
import { useHouseholdInviteLink } from "@mobile/family/use-household-invite-link";

export function MobileApp() {
  const session = useMobileSession();
  const invite = useHouseholdInviteLink();
  const { state } = session;

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
  if (state.status === "OFFLINE_STORAGE_ERROR") {
    return <OfflineStorageErrorScreen message={state.message}
      onRetry={session.retryOfflineStorage} onReturnToSignIn={session.returnToSignIn} />;
  }
  if (state.status === "SIGNED_OUT") {
    return <SignedOutApp passwordResetError={session.passwordResetError}
      signInError={session.signInError} signUpError={session.signUpError}
      signInMessage={session.signInMessage}
      onPasswordReset={session.requestPasswordReset}
      onSignIn={session.signIn} onSignUp={session.signUp} />;
  }
  if (state.status === "PASSWORD_RECOVERY") return <ResetPasswordScreen
    error={session.recoveredPasswordError} onCancel={() => void session.cancelPasswordRecovery()}
    onUpdate={session.finishPasswordRecovery} />;
  return (
    <Suspense
      fallback={
        <main className="mobile-shell">
          <p>Opening this space securely…</p>
        </main>
      }
    >
      <SignedInApp key={state.session.user.id} state={state} onSignOut={session.signOut}
        inviteToken={invite.token} onInviteHandled={invite.clear} />
    </Suspense>
  );
}
