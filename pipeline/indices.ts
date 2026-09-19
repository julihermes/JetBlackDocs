import type { LocationEncounters, TrainerLocation } from "./types.ts";

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

/** Normalizes a species token for cross-referencing (strips form suffixes like "-R", trims). */
function normalizeSpecies(name: string): string {
  return name.trim().replace(/\*/g, "").split("/")[0].trim();
}

export function buildEncountersBySpecies(locations: LocationEncounters[]): Record<string, SpeciesEncounterRef[]> {
  const index: Record<string, SpeciesEncounterRef[]> = {};
  for (const loc of locations) {
    for (const method of loc.methods) {
      for (const row of method.rows) {
        const key = normalizeSpecies(row.species);
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

export function buildTrainersBySpecies(locations: TrainerLocation[]): Record<string, SpeciesTrainerRef[]> {
  const index: Record<string, SpeciesTrainerRef[]> = {};
  for (const loc of locations) {
    for (const battle of loc.battles) {
      for (const mon of battle.pokemon) {
        // A trainer row can list starter alternatives ("Snivy/Tepig/Oshawott") — index each one.
        for (const species of mon.species.split("/").map((s) => s.trim())) {
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
