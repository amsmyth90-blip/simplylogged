import { ResetPasswordScreen } from "@mobile/auth/ResetPasswordScreen";

export function ResetPasswordPreview() {
  return <ResetPasswordScreen error={null} onCancel={() => undefined}
    onUpdate={async () => ({ ok: false })} />;
}
