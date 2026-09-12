// Bind an in-flight browser operation to the account that originated it.
export function matchesSignedInAccount(expected: string | null | undefined, authenticated: string | null | undefined) {
  return Boolean(expected && authenticated && expected === authenticated);
}
