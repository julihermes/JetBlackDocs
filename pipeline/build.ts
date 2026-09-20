import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findBySignature, loadSourceFiles, type SourceFile } from "./lib/source.ts";
import { parseFeatures } from "./parsers/features.ts";
import { parseEvolutions } from "./parsers/evolutions.ts";
import { parseLegendaries } from "./parsers/legendaries.ts";
import { parseMoveChanges } from "./parsers/move-changes.ts";
import { parseItems } from "./parsers/items.ts";
import { parseChangelog } from "./parsers/changelog.ts";
import { parseWildEncounters } from "./parsers/wild-encounters.ts";
import { parseStatsAndLearnsets } from "./parsers/stats-learnsets.ts";
import { parseTrainerRosters } from "./parsers/trainer-rosters.ts";
import { buildEncountersBySpecies, buildTrainersBySpecies, buildLearnedByMove } from "./indices.ts";
import { attachTypes, attachSpeciesInfo, buildTmCompatibility, buildEvolutionLookup, buildMoveList } from "./vanilla-data.ts";
import { computeObtainableSpecies } from "./obtainability.ts";
import { alnumKey } from "./lib/text.ts";
import type { BuildManifest, EvolutionLookup } from "./types.ts";

const OUT_DIR = join(process.cwd(), "src", "data");

function writeJson(name: string, data: unknown): void {
  const path = join(OUT_DIR, `${name}.generated.json`);
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function readPreviousJson<T>(name: string): T | null {
  const path = join(OUT_DIR, `${name}.generated.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

function diffCount(label: string, before: number | null, after: number): string {
  if (before === null) return `${label}: ${after} (first build)`;
  const delta = after - before;
  const sign = delta > 0 ? "+" : "";
  return `${label}: ${after} (${sign}${delta})`;
}

function main() {
  console.log("Loading source files from data-source/ ...");
  const files = loadSourceFiles();
  console.log(`Found ${files.length} .txt files.\n`);

  mkdirSync(OUT_DIR, { recursive: true });

  const summary: string[] = [];
  let hadError = false;

  function run<T>(
    name: string,
    signatureLabel: string,
    signature: RegExp,
    parse: (file: SourceFile) => T,
    count: (data: T) => number,
    postProcess?: (data: T) => T,
  ) {
    try {
      const file = findBySignature(files, signatureLabel, signature);
      const data = postProcess ? postProcess(parse(file)) : parse(file);
      const before = readPreviousJson<T>(name);
      writeJson(name, data);
      summary.push(diffCount(name, before ? count(before) : null, count(data)));
      return data;
    } catch (err) {
      hadError = true;
      console.error(`\n✗ Failed to parse "${signatureLabel}" (${name}):\n`);
      console.error(err instanceof Error ? err.message : err);
      console.error();
      return null;
    }
  }

  const features = run("features", "Features", /Goals with this RomHack/i, parseFeatures, (d) => d.bullets.length);
  const evolutions = run("evolutions", "Evolution Changes", /^JetBlack Evolution Changes:/m, parseEvolutions, (d) => d.length);
  const legendaries = run("legendaries", "Legendary and Mythical locations", /Obelisks/, parseLegendaries, (d) => d.length);
  const moveChanges = run("move-changes", "Move changes", /^Move Changes:/m, parseMoveChanges, (d) => d.changed.length + d.newMoves.length);
  const items = run("items", "Item location changes", /Ground Items/, parseItems, (d) => d.ground.length + d.gifts.length + d.hidden.length);
  const changelog = run("changelog", "Changelog notes", /changenotes/i, parseChangelog, (d) => d.length);
  const wildEncounters = run("wild-encounters", "Wild Pokemon locations", /^\* Means Shaking Grass/m, parseWildEncounters, (d) => d.length);
  const pokemon = run("pokemon", "Stats and Learnsets", /^Ability:/m, parseStatsAndLearnsets, (d) => d.length, (d) => attachSpeciesInfo(attachTypes(d)));
  // Roster rows are recognized by their species name, so the Pokédex has to be parsed first.
  const knownSpecies = new Set((pokemon ?? []).map((p) => p.name.toLowerCase()));
  const unrecognizedRows: string[] = [];
  const trainers = run(
    "trainers",
    "Trainer Rosters",
    /^Unless specified, Trainer/m,
    (file) => parseTrainerRosters(file, knownSpecies, (text, lineNo) => unrecognizedRows.push(`line ${lineNo}: ${text}`)),
    (d) => d.length,
  );

  if (unrecognizedRows.length > 0) {
    console.warn(`\n⚠ ${unrecognizedRows.length} trainer roster row(s) look like a Pokémon but the species didn't resolve — likely a new typo in the source doc:`);
    for (const row of unrecognizedRows) console.warn(`    ${row}`);
    console.warn("  Add the spelling to SPECIES_ALIASES in pipeline/lib/species.ts if so.\n");
  }

  if (wildEncounters) {
    const index = buildEncountersBySpecies(wildEncounters);
    writeJson("encounters-by-species", index);
    summary.push(`encounters-by-species: ${Object.keys(index).length} species indexed`);
  }
  if (trainers) {
    const index = buildTrainersBySpecies(trainers);
    writeJson("trainers-by-species", index);
    summary.push(`trainers-by-species: ${Object.keys(index).length} species indexed`);
  }
  let evolutionLookup: EvolutionLookup | null = null;
  if (evolutions) {
    evolutionLookup = buildEvolutionLookup(evolutions);
    writeJson("evolution-lookup", evolutionLookup);
    summary.push(`evolution-lookup: ${Object.keys(evolutionLookup).length} species indexed`);
  }

  if (pokemon && wildEncounters && legendaries && evolutionLookup) {
    const obtainable = computeObtainableSpecies(pokemon, wildEncounters, legendaries, evolutionLookup);
    for (const p of pokemon) p.obtainable = obtainable.has(p.name);
    writeJson("pokemon", pokemon);
    summary.push(`obtainable species: ${obtainable.size} / ${pokemon.length}`);
  }

  if (pokemon) {
    const tms = buildTmCompatibility(pokemon);
    writeJson("tm-compatibility", tms);
    summary.push(`tm-compatibility: ${Object.values(tms).reduce((n, list) => n + list.length, 0)} entries`);
  }

  let moves = null as ReturnType<typeof buildMoveList> | null;
  if (moveChanges && pokemon) {
    moves = buildMoveList(moveChanges);
    const learnedByMove = buildLearnedByMove(pokemon);
    for (const m of moves) if (!m.isNew) m.learnedBy = learnedByMove[alnumKey(m.name)] ?? [];
    writeJson("moves", moves);
    summary.push(`moves: ${moves.length} (${moves.filter((m) => m.changed).length} changed, ${moves.filter((m) => m.isNew).length} new)`);
  }

  const trainerPortraits: Record<string, string> = JSON.parse(
    readFileSync(join(process.cwd(), "pipeline", "vanilla-data", "trainer-portraits.json"), "utf-8"),
  );
  writeJson("trainer-portraits", trainerPortraits);
  summary.push(`trainer-portraits: ${Object.keys(trainerPortraits).length} portraits`);

  const trainerClassIcons: Record<string, string> = JSON.parse(
    readFileSync(join(process.cwd(), "pipeline", "vanilla-data", "trainer-class-icons.json"), "utf-8"),
  );
  writeJson("trainer-class-icons", trainerClassIcons);
  summary.push(`trainer-class-icons: ${Object.keys(trainerClassIcons).length} classes`);

  const manifest: BuildManifest = {
    generatedAt: new Date().toISOString(),
    counts: Object.fromEntries(
      [
        ["features", features?.bullets.length],
        ["evolutions", evolutions?.length],
        ["legendaries", legendaries?.length],
        ["moveChanges", moveChanges ? moveChanges.changed.length + moveChanges.newMoves.length : undefined],
        ["items", items ? items.ground.length + items.gifts.length + items.hidden.length : undefined],
        ["changelog", changelog?.length],
        ["wildEncounterLocations", wildEncounters?.length],
        ["pokemon", pokemon?.length],
        ["trainerLocations", trainers?.length],
        ["moves", moves?.length],
      ].filter(([, v]) => v !== undefined),
    ),
  };
  writeJson("manifest", manifest);

  console.log("Build summary:");
  for (const line of summary) console.log(`  ${line}`);
  console.log();

  if (hadError) {
    console.error("Data pipeline finished WITH ERRORS — see above. Fix the source .txt or the parser, then re-run.");
    process.exit(1);
  } else {
    console.log("Data pipeline finished successfully.");
  }
}

main();
