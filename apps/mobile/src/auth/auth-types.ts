export type SignUpResult =
  | { ok: false }
  | { ok: true; requiresEmailConfirmation: boolean };

export type SignUp = (
  email: string,
  password: string,
) => Promise<SignUpResult>;

export type PasswordResetRequest = (email: string) => Promise<{ ok: boolean }>;
export type RecoveredPasswordUpdate = (password: string) => Promise<{ ok: boolean }>;
