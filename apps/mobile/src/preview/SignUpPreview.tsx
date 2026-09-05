import { SignUpScreen } from "@mobile/auth/SignUpScreen";

export function SignUpPreview() {
  return <SignUpScreen error={null} onBack={() => undefined}
    onForgotPassword={() => undefined}
    onSignUp={async () => ({ ok: false })} />;
}
