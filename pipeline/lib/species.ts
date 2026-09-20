// Species with a documented "-X" form suffix in these docs (Unown-A, Basculin-R).
// Deliberately a small explicit list rather than a generic "strip after last
// dash" rule — several real species names contain a dash themselves (Ho-Oh),
// which a generic rule would mangle.
const FORM_SUFFIXED_BASE_NAMES = ["Unown", "Basculin"];

/** Maps a possibly form-suffixed token ("Unown-A", "Basculin-R") to its base species name. */
export function baseSpeciesName(raw: string): string {
  const cleaned = raw.replace(/\*/g, "").trim();
  for (const base of FORM_SUFFIXED_BASE_NAMES) {
    if (cleaned === base || cleaned.startsWith(`${base}-`)) return base;
  }
  return cleaned;
}
