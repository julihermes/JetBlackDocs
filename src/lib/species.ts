// Species with a documented "-X" form suffix in these docs (Unown-A, Basculin-R)
// that isn't its own Pokédex entry — mirrors pipeline/lib/species.ts, kept as a
// small explicit list rather than a generic "strip after last dash" rule since
// several real species names contain a dash themselves (Ho-Oh).
const FORM_SUFFIXED_BASE_NAMES = ["Unown", "Basculin"];

/** Maps a possibly form-suffixed token ("Unown-A", "Basculin-R") to its base species name, for looking it up in the Pokédex (which only has one entry per base species). */
export function baseSpeciesName(raw: string): string {
  const cleaned = raw.replace(/\*/g, "").trim();
  for (const base of FORM_SUFFIXED_BASE_NAMES) {
    if (cleaned === base || cleaned.startsWith(`${base}-`)) return base;
  }
  return cleaned;
}
