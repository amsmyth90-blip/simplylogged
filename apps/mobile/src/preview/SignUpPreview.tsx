import { SignUpScreen } from "@mobile/auth/SignUpScreen";

export function SignUpPreview() {
  return <SignUpScreen error={null} onBack={() => undefined}
    onSignUp={async () => ({ ok: false })} />;
}
