import type { TypeChart } from "./types";

/** Every Gen 5 attacking type, in the order the games list them. Fairy is Gen 6. */
export const GEN5_TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
];

/**
 * How much damage each attacking type does to a species, its types multiplied
 * together — so a Grass/Poison defender takes 4x from Fire and 0x from nothing.
 * The chart is keyed by *defending* type, which is the direction this needs.
 */
export function matchupsFor(defenderTypes: string[], chart: TypeChart): Record<string, number> {
  const result: Record<string, number> = {};
  for (const attacking of GEN5_TYPES) {
    let multiplier = 1;
    for (const defending of defenderTypes) {
      const rel = chart[defending.toLowerCase()];
      if (!rel) continue;
      if (rel.noFrom.includes(attacking)) multiplier = 0;
      else if (rel.doubleFrom.includes(attacking)) multiplier *= 2;
      else if (rel.halfFrom.includes(attacking)) multiplier /= 2;
    }
    result[attacking] = multiplier;
  }
  return result;
}

/** "4x", "½x", "0x" — short enough for a 375px column. */
export function formatMultiplier(m: number): string {
  if (m === 0) return "0";
  if (m === 0.25) return "¼";
  if (m === 0.5) return "½";
  return String(m);
}
