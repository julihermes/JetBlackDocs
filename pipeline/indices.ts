import { baseSpeciesName } from "./lib/species.ts";
import { alnumKey } from "./lib/text.ts";
import type { LocationEncounters, PokemonEntry, TrainerLocation } from "./types.ts";

export interface SpeciesEncounterRef {
  location: string;
  method: string;
  levelRange: string;
  chance: string;
  flags: string[];
}

export interface SpeciesTrainerRef {
  location: string;
  trainerName: string;
  level: number | null;
  heldItem?: string;
}

export function buildEncountersBySpecies(locations: LocationEncounters[]): Record<string, SpeciesEncounterRef[]> {
  const index: Record<string, SpeciesEncounterRef[]> = {};
  for (const loc of locations) {
    for (const method of loc.methods) {
      for (const row of method.rows) {
        const key = baseSpeciesName(row.species.split("/")[0]);
        (index[key] ??= []).push({
          location: loc.location,
          method: method.method,
          levelRange: row.levelRange,
          chance: row.chance,
          flags: row.flags,
        });
      }
    }
  }
  return index;
}

/**
 * Reverse index of level-up learnset entries: move name -> species that learn
 * it. Keyed by an alphanumeric-only normalization of the move name, since the
 * hack's own docs spell some moves inconsistently across different species'
 * learnsets (e.g. "PoisonPowder" for most, but "Poison Powder" for Tangela) —
 * callers should look up with the same `alnumKey` (see pipeline/lib/text.ts).
 * TM compatibility is intentionally excluded — it's already shown per-species
 * on the Pokémon detail page, and the freeform TM notes it's parsed from are
 * too ambiguous to safely fold in here.
 */
export function buildLearnedByMove(pokemon: PokemonEntry[]): Record<string, string[]> {
  const index: Record<string, Set<string>> = {};
  for (const p of pokemon) {
    for (const entry of p.learnset) {
      (index[alnumKey(entry.move)] ??= new Set()).add(p.name);
    }
  }
  return Object.fromEntries(Object.entries(index).map(([k, v]) => [k, Array.from(v)]));
}

export function buildTrainersBySpecies(locations: TrainerLocation[]): Record<string, SpeciesTrainerRef[]> {
  const index: Record<string, SpeciesTrainerRef[]> = {};
  for (const loc of locations) {
    for (const battle of loc.battles) {
      for (const mon of battle.pokemon) {
        // A trainer row can list starter alternatives ("Snivy/Tepig/Oshawott") — index each one.
        for (const raw of mon.species.split("/")) {
          const species = baseSpeciesName(raw);
          (index[species] ??= []).push({
            location: loc.location,
            trainerName: battle.trainerName,
            level: mon.level,
            heldItem: mon.heldItem,
          });
        }
      }
    }
  }
  return index;
}
