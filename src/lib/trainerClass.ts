/**
 * Finds the generic trainer-class icon for a battle, given the loaded
 * trainer-class-icons map (keyed by the exact class string as it appears in
 * the roster doc, e.g. "Fisherman", "Blackbelt", "Team Plasma N"). Matches
 * the longest known class prefix so e.g. "Team Plasma N" (a dedicated named
 * icon) is preferred over a shorter "Team Plasma" prefix that doesn't exist
 * anyway. Returns undefined for trainers with no matching class (they get no
 * icon — same graceful fallback used elsewhere on the site).
 */
export function resolveClassIcon(trainerName: string, classIcons: Record<string, string>): string | undefined {
  const keys = Object.keys(classIcons).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (trainerName === key || trainerName.startsWith(`${key} `)) return classIcons[key];
  }
  return undefined;
}
