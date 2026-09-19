/** Case/accent-insensitive substring match — good enough for a few hundred items, no library needed. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function matches(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true;
  return normalize(haystack).includes(normalize(needle));
}
