const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function authenticatedSubject(claims: unknown) {
  if (!claims || typeof claims !== "object") return null;
  const subject = Reflect.get(claims, "sub");
  const role = Reflect.get(claims, "role");
  return typeof subject === "string" && uuidPattern.test(subject) && role === "authenticated"
    ? subject
    : null;
}
