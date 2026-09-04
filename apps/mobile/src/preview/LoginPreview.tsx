import { LoginScreen } from "@mobile/auth/LoginScreen";

export function LoginPreview() {
  return <LoginScreen error={null} onSignIn={async () => ({ ok: false })} />;
}
