import type { SourceFile } from "../lib/source.ts";
import { assertParse } from "../lib/errors.ts";
import { findBoxedHeaders, isBlank, isDashLine } from "../lib/text.ts";
import { baseSpeciesName, canonicalSpeciesName } from "../lib/species.ts";
import type { TrainerBattle, TrainerLocation, TrainerPokemon } from "../types.ts";

const SOURCE_LABEL = "Trainer Rosters";
// Boss trainers (Elite Four, ...) are wrapped as "![Name]!" instead of "[Name]".
const TRAINER_HEADER_RE = /^!?\[([^\]]+)\]!?\s*(.*)$/;
// One block in the source ("[Subway Boss Emmet") is missing its closing bracket.
const UNCLOSED_TRAINER_HEADER_RE = /^!?\[([^\]]+)$/;
const BATTLE_FORMAT_RE = /^(?:Single|Double|Triple|Rotation|Multi)\s+Battle\b/i;
const LOCATION_RE = /^Location:\s*(.+)$/i;
const REWARD_RE = /^Reward:\s*(.+)$/i;
// "-If Snivy was Chosen-", "-Winter Only-", "-Post Game-" ... any dash-wrapped aside.
const WRAPPED_ASIDE_RE = /^-{1,2}\s*(.+?)\s*-{1,2}$/;
const SUB_AREA_RE = /^([A-Z0-9][A-Z0-9 /'-]*):?$/;
const LEVEL_RE = /\bLvl\.?\s*(\d+)/i;
const ITEM_RE = /@\s*(.+?)\s*(?=\bLvl\b|\s-|$)/i;
// A species name is at most this many whitespace-separated tokens ("Mr. Mime").
const MAX_SPECIES_TOKENS = 2;

interface SpeciesMatch {
  species: string;
  rest: string;
}

const STARTERS = ["Snivy", "Tepig", "Oshawott"];

/**
 * Which starter each rival ends up with, given the player's. The doc states
 * this pairing itself in every battle it bothers to split into
 * "--If Snivy was Chosen--" blocks, and it never varies: Cheren takes the
 * starter that beats yours, Bianca the one yours beats. Four early battles
 * are written as a single "Snivy/Tepig/Oshawott" row instead, so they get
 * expanded into the same three-way shape the rest of the doc uses.
 */
const RIVAL_STARTER: Record<string, Record<string, string>> = {
  cheren: { Snivy: "Tepig", Tepig: "Oshawott", Oshawott: "Snivy" },
  bianca: { Snivy: "Oshawott", Tepig: "Snivy", Oshawott: "Tepig" },
};

const isStarterChoice = (species: string) => {
  const parts = species.split("/").map((p) => p.trim());
  return parts.length === STARTERS.length && STARTERS.every((s) => parts.includes(s));
};

function expandStarterChoice(battle: TrainerBattle): TrainerBattle[] {
  if (battle.condition || !battle.pokemon.some((m) => isStarterChoice(m.species))) return [battle];

  const rival = /cheren/i.test(battle.trainerName) ? "cheren" : /bianca/i.test(battle.trainerName) ? "bianca" : undefined;
  if (!rival) return [battle];

  return STARTERS.map((playerStarter) => ({
    ...battle,
    condition: `If ${playerStarter} was Chosen`,
    notes: [...battle.notes],
    pokemon: battle.pokemon.map((mon) =>
      isStarterChoice(mon.species) ? { ...mon, species: RIVAL_STARTER[rival][playerStarter] } : mon,
    ),
  }));
}

/**
 * A line is only a roster row if it actually starts with a species the Pokédex
 * knows — that's what keeps annotations like "Double Battle" or "3/4 Badges:"
 * from being silently recorded as Pokémon. Alternatives separated by "/"
 * ("Snivy/Tepig/Oshawott", for a starter-dependent battle) all have to resolve.
 */
function matchSpecies(text: string, knownSpecies: Set<string>): SpeciesMatch | null {
  const tokens = text.split(/\s+/).filter(Boolean);
  for (let n = Math.min(MAX_SPECIES_TOKENS, tokens.length); n >= 1; n--) {
    const candidate = tokens.slice(0, n).join(" ");
    const parts = candidate.split("/");
    if (parts.every((p) => knownSpecies.has(baseSpeciesName(p).toLowerCase()))) {
      return { species: parts.map((p) => canonicalSpeciesName(p)).join("/"), rest: tokens.slice(n).join(" ") };
    }
  }
  return null;
}

/** Pulls level, held item and note out of whatever follows the species, in whichever order the doc happens to put them. */
function parseRowAttributes(rest: string): Omit<TrainerPokemon, "species"> {
  let remainder = rest;

  const itemMatch = ITEM_RE.exec(remainder);
  if (itemMatch) remainder = remainder.replace(itemMatch[0], " ");

  const levelMatch = LEVEL_RE.exec(remainder);
  if (levelMatch) remainder = remainder.replace(levelMatch[0], " ");

  // The note's closing dash is missing on at least one line in the source, so
  // anything still hanging off the end after a leading dash counts as the note.
  const leftover = remainder.trim();
  const note = leftover.startsWith("-") ? leftover.replace(/^-+/, "").replace(/-+$/, "").trim() : "";

  return {
    level: levelMatch ? Number(levelMatch[1]) : null,
    heldItem: itemMatch?.[1]?.trim() || undefined,
    note: note || undefined,
  };
}

/**
 * Looks ahead past blank lines and per-trainer metadata ("Location: …") for the
 * next line that decides what an annotation meant: a roster row means the
 * annotation labelled another team for the same trainer ("3/4 Badges:",
 * "-Snivy Chosen-"), a trainer header means it was a heading for what follows.
 */
function nextDecidingLine(lines: string[], from: number, knownSpecies: Set<string>): "roster" | "trainer" | undefined {
  for (let i = from; i < lines.length; i++) {
    const text = lines[i].trim();
    if (isBlank(text) || isDashLine(text) || /^-+$/.test(text)) continue;
    if (TRAINER_HEADER_RE.test(text) || UNCLOSED_TRAINER_HEADER_RE.test(text)) return "trainer";
    if (matchSpecies(text, knownSpecies)) return "roster";
    if (LOCATION_RE.test(text) || REWARD_RE.test(text) || BATTLE_FORMAT_RE.test(text)) continue;
    return undefined;
  }
  return undefined;
}

export function parseTrainerRosters(
  file: SourceFile,
  knownSpecies: Set<string>,
  onUnrecognizedRow?: (text: string, lineNo: number) => void,
): TrainerLocation[] {
  assertParse(knownSpecies.size > 0, SOURCE_LABEL, 1, "", "the Pokédex must be parsed before trainer rosters — species recognition depends on it");

  const locationHeaders = findBoxedHeaders(file.lines);
  assertParse(locationHeaders.length > 20, SOURCE_LABEL, 1, "", `expected many locations, found ${locationHeaders.length}`);

  const results = locationHeaders.map((loc, i) => {
    const bodyEnd = i + 1 < locationHeaders.length ? locationHeaders[i + 1].headerLine - 2 : file.lines.length;
    const bodyLines = file.lines.slice(loc.bodyStart - 1, bodyEnd);

    const battles: TrainerBattle[] = [];
    let pendingCondition: string | undefined;
    let currentSubArea: string | undefined;
    let currentBattle: TrainerBattle | null = null;

    const openBattle = (trainerName: string, condition?: string, rewardNote?: string): TrainerBattle => ({
      trainerName,
      condition,
      subArea: currentSubArea,
      pokemon: [],
      rewardNote,
      notes: [],
    });

    const flush = () => {
      if (currentBattle && currentBattle.pokemon.length > 0) battles.push(...expandStarterChoice(currentBattle));
      currentBattle = null;
    };

    bodyLines.forEach((rawText, idx) => {
      const lineNo = loc.bodyStart + idx;
      const text = rawText.trim();
      if (isBlank(text) || isDashLine(text) || /^-+$/.test(text)) return;

      const trainerMatch = TRAINER_HEADER_RE.exec(text) ?? UNCLOSED_TRAINER_HEADER_RE.exec(text);
      if (trainerMatch) {
        flush();
        currentBattle = openBattle(trainerMatch[1].trim(), pendingCondition, trainerMatch[2]?.trim() || undefined);
        pendingCondition = undefined;
        return;
      }

      const speciesMatch = matchSpecies(text, knownSpecies);
      if (speciesMatch && currentBattle) {
        currentBattle.pokemon.push({ species: speciesMatch.species, ...parseRowAttributes(speciesMatch.rest) });
        return;
      }

      // Everything below here is an annotation of some kind, not a Pokémon.
      const asideMatch = WRAPPED_ASIDE_RE.exec(text);
      const label = asideMatch ? asideMatch[1].trim() : text.replace(/:$/, "").trim();

      // Written both bare ("Double Battle") and wrapped ("-Double Battle-").
      if (BATTLE_FORMAT_RE.test(label)) {
        if (currentBattle) currentBattle.battleFormat = label;
        return;
      }

      const locationMatch = LOCATION_RE.exec(text);
      if (locationMatch && currentBattle) {
        currentBattle.locationNote = locationMatch[1].trim();
        return;
      }

      const rewardMatch = REWARD_RE.exec(text);
      if (rewardMatch && currentBattle) {
        currentBattle.rewardNote = rewardMatch[1].trim();
        return;
      }

      const isHeaderShaped = Boolean(asideMatch) || text.endsWith(":") || SUB_AREA_RE.test(text);

      if (isHeaderShaped) {
        const nextIsRosterRow = nextDecidingLine(bodyLines, idx + 1, knownSpecies) === "roster";

        if (nextIsRosterRow && currentBattle) {
          // A second (third, fourth...) team for the same trainer — "3/4 Badges:",
          // "-Snivy Chosen-" — so close the current roster and reopen under the label.
          if (currentBattle.pokemon.length === 0) {
            currentBattle.condition = label;
          } else {
            const { trainerName, rewardNote } = currentBattle;
            flush();
            currentBattle = openBattle(trainerName, label, rewardNote);
          }
          return;
        }

        if (!nextIsRosterRow) {
          flush();
          if (asideMatch) pendingCondition = label;
          else currentSubArea = label;
          return;
        }
      }

      if (currentBattle) currentBattle.notes.push(text);

      // A line that looks like a roster row but whose species didn't resolve is
      // almost certainly a new typo in the source — surface it rather than let
      // it disappear into a note.
      if (LEVEL_RE.test(text)) onUnrecognizedRow?.(text, lineNo);
    });
    flush();

    return { location: loc.title, battles };
  });

  // A location header that wraps further nested boxed sub-locations (e.g.
  // "Post Game Big Stadium and Small court" containing its own "Big Stadium"
  // and "Small Court" headers) ends up with zero direct battles — its content
  // lives on under those nested entries, so the empty wrapper is just dropped.
  return results.filter((r) => r.battles.length > 0);
}
