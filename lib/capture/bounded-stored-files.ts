export type StoredFileLoadResult =
  | { ok: true; files: Blob[] }
  | { ok: false; reason: "FILE_TOO_LARGE" | "MISSING" | "TOTAL_TOO_LARGE" };

type LoadStoredFile<TReference> = (reference: TReference) => Promise<Blob | null>;
type InspectStoredFile<TReference> = (reference: TReference) => Promise<number | null>;

export async function loadBoundedStoredFiles<TReference>(
  references: TReference[],
  inspect: InspectStoredFile<TReference>,
  load: LoadStoredFile<TReference>,
  limits: { maximumFileBytes: number; maximumTotalBytes: number },
): Promise<StoredFileLoadResult> {
  let inspectedBytes = 0;

  for (const reference of references) {
    const size = await inspect(reference);
    if (size === null) return { ok: false, reason: "MISSING" };
    if (!Number.isSafeInteger(size) || size < 0 || size > limits.maximumFileBytes) {
      return { ok: false, reason: "FILE_TOO_LARGE" };
    }
    inspectedBytes += size;
    if (inspectedBytes > limits.maximumTotalBytes) {
      return { ok: false, reason: "TOTAL_TOO_LARGE" };
    }
  }

  const files: Blob[] = [];
  let loadedBytes = 0;
  for (const reference of references) {
    const file = await load(reference);
    if (!file) return { ok: false, reason: "MISSING" };
    if (file.size > limits.maximumFileBytes) {
      return { ok: false, reason: "FILE_TOO_LARGE" };
    }
    loadedBytes += file.size;
    if (loadedBytes > limits.maximumTotalBytes) {
      return { ok: false, reason: "TOTAL_TOO_LARGE" };
    }
    files.push(file);
  }

  return { ok: true, files };
}
