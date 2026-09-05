import { LoginScreen } from "@mobile/auth/LoginScreen";

export function LoginPreview() {
  return <LoginScreen error={null} message={null} onCreateAccount={() => undefined}
    onForgotPassword={() => undefined}
    onSignIn={async () => ({ ok: false })} />;
}
