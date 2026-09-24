import { alnumKey } from "./lib/text.ts";
import type { LegendaryEntry, ObeliskSpecies, PokemonEntry } from "./types.ts";

/**
 * The legendaries doc places sixteen encounters by hand and then says of the
 * rest: "With the exception of Latias, Latios, Phione and Manaphy, as well as
 * the ones listed above, all Legendaries are housed in the Relic Castle as
 * 'Obelisks' ... They are all encountered at Level 70."
 *
 * The four exceptions it names are themselves among the sixteen, so the rule
 * reduces to: every legendary or mythical species the doc doesn't place is an
 * Obelisk. Matched on alnumKey because the doc and PokeAPI disagree on casing
 * for "Ho-oh".
 */
export function buildObeliskList(pokemon: PokemonEntry[], placed: LegendaryEntry[]): ObeliskSpecies[] {
  const placedKeys = new Set(placed.map((e) => alnumKey(e.name)));
  return pokemon
    .filter((p) => p.legendary && !placedKeys.has(alnumKey(p.name)))
    .map((p) => ({ name: p.name, dexNumber: p.dexNumber }));
}
