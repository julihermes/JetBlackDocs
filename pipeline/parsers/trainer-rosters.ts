import type { SourceFile } from "../lib/source.ts";
import { assertParse } from "../lib/errors.ts";
import { findBoxedHeaders, isBlank, isDashLine } from "../lib/text.ts";
import type { TrainerBattle, TrainerLocation } from "../types.ts";

const SOURCE_LABEL = "Trainer Rosters";
// Boss trainers (Elite Four, ...) are wrapped as "![Name]!" instead of "[Name]".
const TRAINER_HEADER_RE = /^!?\[(.+?)\]!?\s*(.*)$/;
const CONDITION_RE = /^-{1,2}(If .+? was Chosen)-{1,2}$/i;
const SUB_AREA_RE = /^([A-Z0-9][A-Z0-9 /'-]*):?\s*$/;
// The level is occasionally missing from the source itself (e.g. the "If Oshawott
// was Chosen" branch of one gym battle) — kept optional rather than failing the build.
const POKEMON_ROW_RE = /^(.+?)(?:\s+@\s*(.+?))?(?:\s+Lvl\.?\s*(\d+))?\s*(-.+-)?\s*$/i;

export function parseTrainerRosters(file: SourceFile): TrainerLocation[] {
  const locationHeaders = findBoxedHeaders(file.lines);
  assertParse(locationHeaders.length > 20, SOURCE_LABEL, 1, "", `expected many locations, found ${locationHeaders.length}`);

  const results = locationHeaders.map((loc, i) => {
    const bodyEnd = i + 1 < locationHeaders.length ? locationHeaders[i + 1].headerLine - 2 : file.lines.length;
    const bodyLines = file.lines.slice(loc.bodyStart - 1, bodyEnd);

    const battles: TrainerBattle[] = [];
    let currentCondition: string | undefined;
    let currentSubArea: string | undefined;
    let currentBattle: TrainerBattle | null = null;

    const flush = () => {
      if (currentBattle) battles.push(currentBattle);
      currentBattle = null;
    };

    bodyLines.forEach((rawText, idx) => {
      const lineNo = loc.bodyStart + idx;
      const text = rawText.trim();
      if (isBlank(text) || isDashLine(text)) return;

      const conditionMatch = CONDITION_RE.exec(text);
      if (conditionMatch) {
        currentCondition = conditionMatch[1];
        return;
      }

      const subAreaMatch = SUB_AREA_RE.exec(text);
      if (subAreaMatch) {
        currentSubArea = subAreaMatch[1].trim();
        return;
      }

      const trainerMatch = TRAINER_HEADER_RE.exec(text);
      if (trainerMatch) {
        flush();
        const [, trainerName, trailing] = trainerMatch;
        currentBattle = {
          trainerName: trainerName.trim(),
          condition: currentCondition,
          subArea: currentSubArea,
          pokemon: [],
          rewardNote: trailing?.trim() || undefined,
        };
        return;
      }

      // A stray line before any trainer is intro prose for the location (e.g.
      // "The Battle Company is an optional side quest...") — skip it rather
      // than fail the build; only lines *inside* a trainer block must parse.
      if (!currentBattle) return;

      const m = POKEMON_ROW_RE.exec(text);
      assertParse(m, SOURCE_LABEL, lineNo, rawText, 'pokemon row didn\'t match "Species [@Item] Lvl N [-note-]"');
      const [, species, item, levelStr, note] = m;
      currentBattle!.pokemon.push({
        species: species.trim(),
        level: levelStr ? Number(levelStr) : null,
        heldItem: item?.trim() || undefined,
        note: note ? note.replace(/^-|-$/g, "").trim() : undefined,
      });
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
