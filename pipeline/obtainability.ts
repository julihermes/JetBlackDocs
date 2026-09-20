import { baseSpeciesName } from "./lib/species.ts";
import type { EvolutionLookup, LegendaryEntry, LocationEncounters, PokemonEntry } from "./types.ts";

// Given as a gift at the very start of the game — never a wild encounter.
const STARTERS = new Set(["Snivy", "Tepig", "Oshawott"]);

/**
 * Flags species with no documented way into the player's party. The source
 * docs are explicit that the *stats/learnset* doc covers the full National
 * Dex for reference even though only some of it is actually reachable in a
 * playthrough ("full national dex CAN be completed (Will require breeding)"
 * — changelog v1.5) — so a species with zero wild encounters, isn't a gift/
 * legendary/starter, AND isn't in the same evolution family as one that is,
 * has no documented source at all, breeding included.
 *
 * This is a heuristic, not a certainty (an undocumented gift/event could
 * exist), so it's surfaced in the UI as "not documented as obtainable"
 * rather than an absolute claim.
 */
export function computeObtainableSpecies(
  pokemon: PokemonEntry[],
  wildEncounters: LocationEncounters[],
  legendaries: LegendaryEntry[],
  evolutionLookup: EvolutionLookup,
): Set<string> {
  const directlyObtainable = new Set<string>(STARTERS);

  for (const loc of wildEncounters) {
    for (const method of loc.methods) {
      for (const row of method.rows) {
        directlyObtainable.add(baseSpeciesName(row.species));
      }
    }
  }
  for (const leg of legendaries) directlyObtainable.add(leg.name);

  // Evolution families share obtainability: catching any one stage means
  // breeding reaches the earlier stages and levelling reaches the later ones.
  const neighbors = (name: string): string[] => {
    const entry = evolutionLookup[name];
    if (!entry) return [];
    return [entry.evolvesFrom?.species, ...entry.evolvesTo.map((e) => e.species)].filter((x): x is string => Boolean(x));
  };

  const obtainable = new Set<string>();
  const validNames = new Set(pokemon.map((p) => p.name));

  for (const start of directlyObtainable) {
    if (!validNames.has(start) || obtainable.has(start)) continue;
    const stack = [start];
    while (stack.length) {
      const current = stack.pop()!;
      if (obtainable.has(current)) continue;
      obtainable.add(current);
      for (const n of neighbors(current)) if (!obtainable.has(n)) stack.push(n);
    }
  }

  return obtainable;
}
