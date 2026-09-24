import { readFileSync } from "node:fs";
import { join } from "node:path";
import { alnumKey } from "./lib/text.ts";
import { canonicalSpeciesName } from "./lib/species.ts";
import type { EvolutionEntry, EvolutionEdge, EvolutionLookup, MoveChangesData, MoveEntry, PokemonEntry, TmEntry, VanillaMoveInfo, VanillaSpeciesInfo } from "./types.ts";

interface VanillaEvolutionEdge {
  fromId: number;
  from: string;
  toId: number;
  to: string;
  method: string;
}

/**
 * JetBlack explicitly does not change Pokémon types ("no Type changes" per the
 * author's own feature list), so National Dex type data — unlike everything
 * else in this pipeline — is safe to source from a static reference file
 * instead of the hack's own docs. Fetched once from PokeAPI (see
 * pipeline/vanilla-data/README.md) and committed; it never needs re-fetching
 * when a new hack version drops, since it isn't hack-specific.
 */
export function attachTypes(pokemon: PokemonEntry[]): PokemonEntry[] {
  const path = join(process.cwd(), "pipeline", "vanilla-data", "types.json");
  const raw = readFileSync(path, "utf-8");
  const byDexNumber: Record<string, string[]> = JSON.parse(raw);

  return pokemon.map((p) => ({
    ...p,
    types: byDexNumber[String(p.dexNumber)] ?? [],
  }));
}

/**
 * Height, weight, gender ratio, egg groups, catch rate, hatch cycles, dex
 * category, and Gen 5 flavor text: none of these appear in JetBlack's own
 * docs, because the hack's feature list never claims to change them (only
 * stats, movesets, abilities, evolution methods, encounters, and trainer
 * rosters are documented as altered). So — like attachTypes — this is safe to
 * source wholesale from a static PokéAPI snapshot, filtered to the Black
 * version's flavor text for Gen 5 accuracy, with no hack-override merge
 * needed. See pipeline/vanilla-data/README.md for provenance.
 */
export function attachSpeciesInfo(pokemon: PokemonEntry[]): PokemonEntry[] {
  const path = join(process.cwd(), "pipeline", "vanilla-data", "species-info.json");
  const raw = readFileSync(path, "utf-8");
  const byDexNumber: Record<string, VanillaSpeciesInfo> = JSON.parse(raw);

  return pokemon.map((p) => {
    const info = byDexNumber[String(p.dexNumber)];
    if (!info) return p;
    return { ...p, ...info };
  });
}

/**
 * Builds the TM/HM list for every species: the vanilla Gen 5 (Black/White)
 * machine compatibility from PokeAPI, plus the extra machines JetBlack's notes
 * grant ("Can learn TM83 Work Up via TM"), flagged so the site can mark them.
 * The hack's doc is prose written by hand, so its TM *numbers* are occasionally
 * wrong (it calls Grass Knot TM53, which is Energy Ball) — the move name is the
 * reliable half, so an addition whose move exists in the Gen 5 machine list is
 * renumbered from that list rather than trusted as written.
 *
 * Kept out of pokemon.generated.json and written as its own file: ~20k entries
 * would more than double a payload every list page already pays for, while only
 * the species detail page ever needs them.
 */
export function buildTmCompatibility(pokemon: PokemonEntry[]): Record<string, TmEntry[]> {
  const path = join(process.cwd(), "pipeline", "vanilla-data", "tm-compatibility.json");
  const byDexNumber: Record<string, TmEntry[]> = JSON.parse(readFileSync(path, "utf-8"));

  // PokeAPI's slugs title-case every word ("Will-O-Wisp", "X-Scissor"), so move
  // names are re-spelled from the move list the rest of the site links against.
  const movesPath = join(process.cwd(), "pipeline", "vanilla-data", "moves.json");
  const moveNames = new Map<string, string>(
    Object.keys(JSON.parse(readFileSync(movesPath, "utf-8")) as Record<string, VanillaMoveInfo>).map((name) => [alnumKey(name), name]),
  );
  const spell = (move: string) => moveNames.get(alnumKey(move)) ?? move;

  const canonical = new Map<string, TmEntry>();
  for (const entries of Object.values(byDexNumber)) {
    for (const e of entries) if (!canonical.has(alnumKey(e.move))) canonical.set(alnumKey(e.move), { ...e, move: spell(e.move) });
  }

  const result: Record<string, TmEntry[]> = {};
  for (const p of pokemon) {
    const vanilla = (byDexNumber[String(p.dexNumber)] ?? []).map((e) => ({ ...e, move: spell(e.move) }));
    const seen = new Set(vanilla.map((e) => e.tm));
    const added: TmEntry[] = [];
    for (const raw of p.tmAdditions) {
      const known = canonical.get(alnumKey(raw.move));
      const entry: TmEntry = known ? { ...known, addedByHack: true } : raw;
      // A machine the species already learns in vanilla is just the doc
      // restating a vanilla fact — keep the vanilla entry, don't duplicate it.
      if (seen.has(entry.tm)) continue;
      seen.add(entry.tm);
      added.push(entry);
    }
    result[p.name] = [...vanilla, ...added].sort((a, b) => a.tm.localeCompare(b.tm));
  }
  return result;
}

/**
 * Merges JetBlack's documented move changes onto the full Gen 5 vanilla move
 * roster (pipeline/vanilla-data/moves.json) — same precedence idea as
 * buildEvolutionLookup: the hack's own doc only lists what it *changed*, so
 * everything else (the vast majority of the ~559 Gen 5 moves) stays exactly
 * as vanilla Black had it. New moves the hack adds have no vanilla
 * counterpart, so they're appended as-is from the doc.
 */
export function buildMoveList(moveChanges: MoveChangesData): MoveEntry[] {
  const path = join(process.cwd(), "pipeline", "vanilla-data", "moves.json");
  const vanillaMoves: Record<string, VanillaMoveInfo> = JSON.parse(readFileSync(path, "utf-8"));

  // The hack's own doc sometimes spells a move without the space PokéAPI's
  // canonical name uses (e.g. "Grasswhistle" vs "Grass Whistle",
  // "Ancientpower" vs "Ancient Power") — likely the in-game text's own
  // one-word rendering. Match on the exact name first, falling back to an
  // alphanumeric-only comparison so those still resolve correctly.
  // A couple of fields (e.g. Eerie Spell's "PP: 15 (10 in mainline titles)")
  // carry a parenthetical aside after JetBlack's own number — parseInt reads
  // just the leading digits, taking the hack's value and ignoring the aside.
  const parseNum = (s: string): number | undefined => {
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? undefined : n;
  };
  const changedByName = new Map(moveChanges.changed.map((m) => [m.name.toLowerCase(), m]));
  const changedByAlnum = new Map(moveChanges.changed.map((m) => [alnumKey(m.name), m]));

  const entries: MoveEntry[] = Object.entries(vanillaMoves).map(([name, info]) => {
    const change = changedByName.get(name.toLowerCase()) ?? changedByAlnum.get(alnumKey(name));
    if (!change) {
      return { name, ...info, changed: false, fieldChanges: [], changeNotes: [], isNew: false, learnedBy: [], machine: null, machineSpecies: 0 };
    }

    const merged: VanillaMoveInfo = { ...info };
    for (const c of change.changes) {
      const field = c.field.toLowerCase();
      if (field === "power") merged.power = parseNum(c.to) ?? merged.power;
      else if (field === "accuracy" || field === "acc") merged.accuracy = parseNum(c.to) ?? merged.accuracy;
      else if (field === "pp") merged.pp = parseNum(c.to) ?? merged.pp;
      else if (field === "type") merged.type = c.to.toLowerCase();
      else if (field === "category") merged.damageClass = c.to.toLowerCase() as VanillaMoveInfo["damageClass"];
    }

    // Most rows are written as a diff ("Power: 55 > 60"), but a few are stated
    // flat ("All have 200 Base Power, 1 PP") and arrive with no `from`. The
    // vanilla figure is right here, so fill it in rather than render a
    // half-diff the reader can't measure against anything.
    const vanillaValue: Record<string, string | undefined> = {
      power: info.power?.toString(),
      accuracy: info.accuracy?.toString(),
      acc: info.accuracy?.toString(),
      pp: info.pp?.toString(),
      type: info.type,
      category: info.damageClass,
    };
    // Grasswhistle's row restates its unchanged PP; once the vanilla value is
    // filled in that reads "15 > 15", so drop a row that changes nothing.
    const fieldChanges = change.changes
      .map((c) => (c.from ? c : { ...c, from: vanillaValue[c.field.toLowerCase()] }))
      .filter((c) => c.from !== c.to);

    return { name, ...merged, changed: true, fieldChanges, changeNotes: change.notes, isNew: false, learnedBy: [], machine: null, machineSpecies: 0 };
  });

  // The doc's "Moves from later Gens" section only *names* most imported moves
  // and what they replace; only the ones it marks "**" get a stats block. The
  // rest keep their mainline figures, so those are the baseline — without them
  // Liquidation rendered as a Normal-type Status move with 0 PP.
  const laterGenPath = join(process.cwd(), "pipeline", "vanilla-data", "later-gen-moves.json");
  const laterGen: Record<string, VanillaMoveInfo> = JSON.parse(readFileSync(laterGenPath, "utf-8"));

  // "special (is physical in the mainline titles)" — the doc annotates a value
  // in place, the same way it writes "PP: 15 (10 in mainline titles)".
  const bare = (v: string | undefined) => v?.replace(/\s*\(.*$/, "").trim().toLowerCase();

  for (const m of moveChanges.newMoves) {
    const base: Partial<VanillaMoveInfo> = laterGen[m.name] ?? {};
    const type = bare(m.type) ?? base.type ?? "normal";
    const damageClass = (bare(m.damageCategory) as VanillaMoveInfo["damageClass"]) ?? base.damageClass ?? "status";
    entries.push({
      name: m.name,
      type,
      damageClass,
      power: (m.power ? parseNum(m.power) : undefined) ?? base.power ?? null,
      // "Accuracy: Always Hits" has no number to parse and no mainline value
      // either (Flower Trick genuinely bypasses the accuracy check): null, which
      // the page already renders as "—".
      accuracy: (m.accuracy ? parseNum(m.accuracy) : undefined) ?? base.accuracy ?? null,
      pp: (m.pp ? parseNum(m.pp) : undefined) ?? base.pp ?? 0,
      flavorText: base.flavorText ?? "",
      effect: m.effect || base.effect || "",
      changed: false,
      fieldChanges: [],
      changeNotes: [],
      isNew: true,
      learnedBy: m.learnedBy,
      machine: null,
      machineSpecies: 0,
    });
  }

  return entries;
}

/**
 * Pairs each changed evolution with the method vanilla Black used, so the site
 * can show what the change actually was rather than just its result. Matched on
 * from+to (alphanumeric, since the doc writes "Porygon-Z" where the reference
 * data writes "Porygon Z"), and carries the dex numbers along for the sprites.
 */
export function attachVanillaEvolutionMethod(hackEvolutions: EvolutionEntry[]): EvolutionEntry[] {
  const path = join(process.cwd(), "pipeline", "vanilla-data", "evolutions.json");
  const vanillaEdges: VanillaEvolutionEdge[] = JSON.parse(readFileSync(path, "utf-8"));

  const byPair = new Map(vanillaEdges.map((e) => [`${alnumKey(e.from)}|${alnumKey(e.to)}`, e]));
  const dexByName = new Map<string, number>();
  for (const e of vanillaEdges) {
    dexByName.set(alnumKey(e.from), e.fromId);
    dexByName.set(alnumKey(e.to), e.toId);
  }

  return hackEvolutions.map((e) => ({
    ...e,
    vanillaCondition: byPair.get(`${alnumKey(e.from)}|${alnumKey(e.to)}`)?.method,
    fromDexNumber: dexByName.get(alnumKey(e.from)),
    toDexNumber: dexByName.get(alnumKey(e.to)),
  }));
}

/**
 * The Evolution Changes doc only lists methods JetBlack *altered* — a species
 * that evolves exactly like vanilla Black (the vast majority) is absent from
 * it entirely, not "no evolution". This fills that gap for the per-Pokémon
 * page using the same vanilla reference data as attachTypes, while keeping
 * the dedicated Evolutions page (evolutions.generated.json) as a clean list
 * of only what the hack actually changed — a species with a hack-documented
 * method here always wins over the vanilla one for that same "from" species,
 * since JetBlack replaced it (this is also how trade evolutions, which the
 * hack removes entirely, get correctly overridden rather than duplicated).
 */
export function buildEvolutionLookup(hackEvolutions: EvolutionEntry[]): EvolutionLookup {
  const path = join(process.cwd(), "pipeline", "vanilla-data", "evolutions.json");
  const vanillaEdges: VanillaEvolutionEdge[] = JSON.parse(readFileSync(path, "utf-8"));

  // Branching species (e.g. Poliwhirl -> Poliwrath by level, or -> Politoed,
  // which JetBlack changed from trade to holding a King's Rock) need the
  // override matched on the exact from+to pair, not just "from" — otherwise
  // fixing one branch would wrongly hide the untouched other branch too.
  // PokeAPI and the stats doc disagree on a handful of spellings ("Nidoran F"
  // vs "NidoranF", "Taillow" vs the doc's "Tailow"), and this lookup is keyed
  // on species name, so an un-normalized edge silently indexes a species that
  // no Pokédex page can ever ask for — the page then claims it has no
  // evolutions at all.
  const name = (raw: string) => canonicalSpeciesName(raw);
  const hackPairs = new Set(hackEvolutions.map((e) => `${name(e.from)}|${name(e.to)}`));
  const edges: Array<{ from: string; to: string; method: string; changed: boolean }> = [
    ...hackEvolutions.map((e) => ({ from: name(e.from), to: name(e.to), method: e.condition, changed: true })),
    ...vanillaEdges
      .filter((e) => !hackPairs.has(`${name(e.from)}|${name(e.to)}`))
      .map((e) => ({ from: name(e.from), to: name(e.to), method: e.method, changed: false })),
  ];

  const lookup: EvolutionLookup = {};
  const ensure = (name: string) => (lookup[name] ??= { evolvesTo: [] });

  for (const e of edges) {
    const edge: EvolutionEdge = { species: e.to, method: e.method, changed: e.changed };
    ensure(e.from).evolvesTo.push(edge);
    ensure(e.to).evolvesFrom = { species: e.from, method: e.method, changed: e.changed };
  }

  return lookup;
}
