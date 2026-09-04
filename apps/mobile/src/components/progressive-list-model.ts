export function nextProgressiveLimit(
  current: number,
  pageSize: number,
  total: number,
) {
  return Math.min(total, current + pageSize);
}
