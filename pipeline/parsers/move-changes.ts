import type { SourceFile } from "../lib/source.ts";
import { assertParse } from "../lib/errors.ts";
import { isBlank } from "../lib/text.ts";
import type { ChangedMove, MoveChangesData, NewMove } from "../types.ts";

const SOURCE_LABEL = "Move changes";

const MOVE_HEADER_RE = /^\[(.+)\]\s*$/;
const FIELD_RE = /^([A-Za-z ]+):\s*(.+)$/;
const LATER_GENS_HEADER = /^Moves from later Gens$/i;
const NEW_MOVE_LIST_RE = /^(.+?)(?:\[(v[\d.]+)\])?(\*\*?)?\s*-\s*Replaces\s+(.+)$/i;
const DISTRIBUTION_INTRO_RE = /^-?The following Pokemon have these moves added/i;
const NATIONAL_DEX_HEADER_RE = /^-National Dex learnset additions-$/i;

/** Parses a `[Name]` ... field-change block into structured changes + freeform notes. */
function parseFieldBlock(lines: Array<{ n: number; text: string }>): { changes: ChangedMove["changes"]; notes: string[] } {
  const changes: ChangedMove["changes"] = [];
  const notes: string[] = [];
  let collectingEffect = false;

  for (const { text } of lines) {
    const trimmed = text.trim();
    if (isBlank(trimmed)) continue;

    if (/^Effect:?$/i.test(trimmed)) {
      collectingEffect = true;
      continue;
    }

    const fieldMatch = FIELD_RE.exec(trimmed);
    if (fieldMatch && !collectingEffect) {
      const [, field, valueRaw] = fieldMatch;
      const arrowSplit = valueRaw.split(">").map((s) => s.trim());
      if (arrowSplit.length === 2) {
        changes.push({ field: field.trim(), from: arrowSplit[0], to: arrowSplit[1] });
      } else {
        changes.push({ field: field.trim(), to: valueRaw.trim() });
      }
      continue;
    }

    // "Acc 100" style shorthand (no colon) or general freeform note/effect text.
    const shorthand = /^(Acc|Power|PP)\s+(.+)$/i.exec(trimmed);
    if (shorthand && !collectingEffect) {
      changes.push({ field: shorthand[1], to: shorthand[2].trim() });
      continue;
    }

    notes.push(trimmed);
  }

  return { changes, notes };
}

export function parseMoveChanges(file: SourceFile): MoveChangesData {
  const laterGensIdx = file.lines.findIndex((l) => LATER_GENS_HEADER.test(l.trim()));
  assertParse(laterGensIdx !== -1, SOURCE_LABEL, 1, "", '"Moves from later Gens" section not found');

  // --- Part 1: stat/property changes on existing moves ---
  const changedLines = file.lines.slice(0, laterGensIdx);
  const changed: ChangedMove[] = [];
  let current: { name: string; lines: Array<{ n: number; text: string }> } | null = null;

  const flush = () => {
    if (!current) return;
    const { changes, notes } = parseFieldBlock(current.lines);
    changed.push({ name: current.name, changes, notes });
  };

  changedLines.forEach((text, i) => {
    const headerMatch = MOVE_HEADER_RE.exec(text.trim());
    if (headerMatch) {
      flush();
      current = { name: headerMatch[1].trim(), lines: [] };
    } else if (current) {
      current.lines.push({ n: i + 1, text });
    }
  });
  flush();

  assertParse(changed.length > 10, SOURCE_LABEL, 1, "", `expected many changed moves, found ${changed.length}`);

  // --- Part 2: new moves list ("Name[vX.X]** - Replaces OldMove") ---
  const restLines = file.lines.slice(laterGensIdx);
  const distributionIdx = restLines.findIndex((l) => DISTRIBUTION_INTRO_RE.test(l.trim()));
  assertParse(distributionIdx !== -1, SOURCE_LABEL, laterGensIdx, "", "distribution intro line not found");

  const listAndDefsLines = restLines.slice(0, distributionIdx);
  const newMoves = new Map<string, NewMove>();

  listAndDefsLines.forEach((rawText) => {
    const text = rawText.trim();
    const m = NEW_MOVE_LIST_RE.exec(text);
    if (!m) return;
    const nameRaw = m[1].trim().replace(/\s*\(.+\)$/, ""); // drop "(Paravolt Charge due to space)" style asides
    newMoves.set(nameRaw, {
      name: nameRaw,
      version: m[2],
      replaces: m[4].trim(),
      learnedBy: [],
    });
  });

  assertParse(newMoves.size > 5, SOURCE_LABEL, laterGensIdx, "", `expected several new moves, found ${newMoves.size}`);

  // Definition blocks for the new moves, same [Name] field-block format as Part 1.
  let currentDef: { name: string; lines: Array<{ n: number; text: string }> } | null = null;
  const flushDef = () => {
    if (!currentDef) return;
    const move = newMoves.get(currentDef.name);
    if (!move) return; // stray [Name] block that isn't one of the listed new moves
    const { changes, notes } = parseFieldBlock(currentDef.lines);
    for (const c of changes) {
      const key = c.field.toLowerCase();
      if (key === "type") move.type = c.to;
      else if (key.startsWith("damage")) move.damageCategory = c.to;
      else if (key === "power") move.power = c.to;
      else if (key === "accuracy") move.accuracy = c.to;
      else if (key === "pp") move.pp = c.to;
    }
    if (notes.length) move.effect = notes.join(" ");
  };

  listAndDefsLines.forEach((text, i) => {
    const headerMatch = MOVE_HEADER_RE.exec(text.trim());
    if (headerMatch) {
      flushDef();
      currentDef = { name: headerMatch[1].trim(), lines: [] };
    } else if (currentDef) {
      currentDef.lines.push({ n: i + 1, text });
    }
  });
  flushDef();

  // --- Part 3: distribution lists (Unova learnset additions + National Dex additions) ---
  const distributionLines = restLines.slice(distributionIdx);
  const nationalDexIdx = distributionLines.findIndex((l) => NATIONAL_DEX_HEADER_RE.test(l.trim()));
  assertParse(nationalDexIdx !== -1, SOURCE_LABEL, distributionIdx, "", '"-National Dex learnset additions-" header not found');

  function collectDistribution(lines: string[]) {
    let currentMove: NewMove | null = null;
    for (const rawText of lines) {
      const text = rawText.trim();
      if (isBlank(text)) {
        currentMove = null;
        continue;
      }
      const headerMatch = /^(.+):$/.exec(text);
      if (headerMatch && newMoves.has(headerMatch[1].trim())) {
        currentMove = newMoves.get(headerMatch[1].trim())!;
        continue;
      }
      if (currentMove) {
        const names = text
          .replace(/[.#]+$/, "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        currentMove.learnedBy.push(...names);
      }
    }
  }

  collectDistribution(distributionLines.slice(0, nationalDexIdx));
  collectDistribution(distributionLines.slice(nationalDexIdx + 1));

  return { changed, newMoves: Array.from(newMoves.values()) };
}
