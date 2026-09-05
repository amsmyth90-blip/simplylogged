export const MOBILE_AUTH_CONFIRM_URL = "diarydock://auth/confirm";
export const MOBILE_AUTH_RESET_URL = "diarydock://auth/reset";

export type MobileAuthLink = {
  code: string;
  purpose: "CONFIRM_EMAIL" | "RESET_PASSWORD";
};

const authorizationCode = /^[A-Za-z0-9._~-]{16,2048}$/;

export function parseMobileAuthLink(value: string): MobileAuthLink | null {
  try {
    const url = new URL(value);
    const parameters = [...url.searchParams.keys()];
    if (
      url.protocol !== "diarydock:"
      || url.hostname !== "auth"
      || (url.pathname !== "/confirm" && url.pathname !== "/reset")
      || url.username
      || url.password
      || url.hash
      || parameters.length !== 1
      || parameters[0] !== "code"
    ) return null;

    const code = url.searchParams.get("code") ?? "";
    if (!authorizationCode.test(code)) return null;
    return {
      code,
      purpose: url.pathname === "/reset" ? "RESET_PASSWORD" : "CONFIRM_EMAIL",
    };
  } catch {
    return null;
  }
}
