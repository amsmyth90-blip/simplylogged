import { useState } from "react";

import { ForgotPasswordScreen } from "./ForgotPasswordScreen";
import { LoginScreen } from "./LoginScreen";
import { SignUpScreen } from "./SignUpScreen";
import type { PasswordResetRequest, SignUp } from "./auth-types";

type SignedOutAppProps = {
  passwordResetError: string | null;
  signInError: string | null;
  signInMessage: string | null;
  signUpError: string | null;
  onPasswordReset: PasswordResetRequest;
  onSignIn: (email: string, password: string) => Promise<{ ok: boolean }>;
  onSignUp: SignUp;
};

export function SignedOutApp(props: SignedOutAppProps) {
  const [screen, setScreen] = useState<"FORGOT_PASSWORD" | "SIGN_IN" | "SIGN_UP">("SIGN_IN");

  if (screen === "FORGOT_PASSWORD") return <ForgotPasswordScreen
    error={props.passwordResetError} onRequest={props.onPasswordReset}
    onBack={() => setScreen("SIGN_IN")} />;
  if (screen === "SIGN_UP") {
    return <SignUpScreen error={props.signUpError} onSignUp={props.onSignUp}
      onBack={() => setScreen("SIGN_IN")}
      onForgotPassword={() => setScreen("FORGOT_PASSWORD")} />;
  }
  return <LoginScreen error={props.signInError} message={props.signInMessage}
    onSignIn={props.onSignIn}
    onCreateAccount={() => setScreen("SIGN_UP")}
    onForgotPassword={() => setScreen("FORGOT_PASSWORD")} />;
}
