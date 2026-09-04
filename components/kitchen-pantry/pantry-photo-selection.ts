import {
  MAX_PANTRY_PHOTO_BYTES,
  MAX_PANTRY_PHOTO_COUNT,
  MAX_PANTRY_TOTAL_PHOTO_BYTES,
} from "@/lib/pantry-analysis";

export function selectPantryPhotos(current: File[], selected: File[]) {
  const images = selected.filter((file) => file.type.startsWith("image/"));
  if (!images.length) return { files: current, error: "Choose a supported kitchen photo." };
  const files = [...current, ...images].slice(0, MAX_PANTRY_PHOTO_COUNT);
  if (files.some((file) => file.size > MAX_PANTRY_PHOTO_BYTES)) {
    return { files: current, error: "Keep each kitchen photo under 8 MB." };
  }
  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  if (totalBytes > MAX_PANTRY_TOTAL_PHOTO_BYTES) {
    return { files: current, error: "Keep the combined kitchen photos under 16 MB." };
  }
  return { files, error: null };
}
