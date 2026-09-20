// Species with a documented "-X" form suffix in these docs (Unown-A, Basculin-R).
// Deliberately a small explicit list rather than a generic "strip after last
// dash" rule — several real species names contain a dash themselves (Ho-Oh),
// which a generic rule would mangle.
const FORM_SUFFIXED_BASE_NAMES = ["Unown", "Basculin", "Rotom", "Wormadam"];

/**
 * Species the docs misspell, mapped to the spelling the Pokédex uses — note
 * the targets are the *stats doc's* spellings, typos and all ("Kangaskan",
 * "Flaafy"), because that's what pokemon.generated.json is keyed on and what
 * the cross-links have to resolve against.
 */
const SPECIES_ALIASES: Record<string, string> = {
  amoongus: "Amoonguss",
  basculinb: "Basculin",
  basculinr: "Basculin",
  cincinno: "Cinccino",
  cryonogal: "Cryogonal",
  excavalier: "Escavalier",
  flaaffy: "Flaafy",
  kangaskhan: "Kangaskan",
  lipard: "Liepard",
  "mr.mime": "Mr. Mime",
  sawbuck: "Sawsbuck",
  tranquil: "Tranquill",
  whismicott: "Whimsicott",
};

/** Corrects a misspelled species token to the Pokédex's spelling, keeping any form suffix intact ("Basculin-R" stays "Basculin-R"). For display. */
export function canonicalSpeciesName(raw: string): string {
  const cleaned = raw.replace(/\*/g, "").trim();
  return SPECIES_ALIASES[cleaned.toLowerCase()] ?? cleaned;
}

/** Maps a possibly form-suffixed or misspelled token ("Unown-A", "Basculin-R", "Cincinno") to the species name the Pokédex is keyed on. For lookups and index keys. */
export function baseSpeciesName(raw: string): string {
  const cleaned = canonicalSpeciesName(raw);
  // The suffix is a single token — without this guard "Basculin-R Lvl" would
  // read as a valid form of Basculin and swallow the rest of the roster row.
  if (!cleaned.includes(" ")) {
    for (const base of FORM_SUFFIXED_BASE_NAMES) {
      if (cleaned === base || cleaned.startsWith(`${base}-`)) return base;
    }
  }
  return cleaned;
}
