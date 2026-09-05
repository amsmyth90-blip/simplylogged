import { ForgotPasswordScreen } from "@mobile/auth/ForgotPasswordScreen";

export function ForgotPasswordPreview() {
  return <ForgotPasswordScreen error={null} onBack={() => undefined}
    onRequest={async () => ({ ok: false })} />;
}
