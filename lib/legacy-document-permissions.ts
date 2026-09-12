// Legacy display labels are optional; current resource access is checked separately.
export function legacyDocumentPermissionError<T extends { code?: string }>(error: T | null): T | null {
  return error?.code === "PGRST205" || error?.code === "42P01" ? null : error;
}
