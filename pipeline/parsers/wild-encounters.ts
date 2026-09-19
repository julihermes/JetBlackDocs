import type { SourceFile } from "../lib/source.ts";
import { assertParse } from "../lib/errors.ts";
import { isBlank, isDashLine, type BoxedHeader } from "../lib/text.ts";
import type { EncounterMethod, EncounterRow, LocationEncounters } from "../types.ts";

const SOURCE_LABEL = "Wild Pokemon locations";

// e.g. "Audino*  Lvl 2-4  100%*", "Tranquill Lvl 24-25 20%- Spring/Summer/Autumn only",
// or "Klink Lvl 25-27 40% (30% on B2F)"
const ROW_RE = /^(\S.*?)\s+Lvl\s+(\d+(?:-\d+)?)\s+(\d+%)\*?\s*(.*)$/i;

// A method section with exactly one Pokemon (open dash, one row, close dash) is
// structurally indistinguishable from a "----\nTitle\n----" header — reject any
// header candidate whose "title" is actually an encounter row.
function isRealHeader(h: BoxedHeader): boolean {
  return !ROW_RE.test(h.title);
}

/**
 * Top-level locations are boxed *and* preceded by a blank line before their
 * own opening dash ("...\n\n----\nRoute 2\n----\n..."). That extra blank is
 * what tells a real location apart from a method/floor/room header that
 * happens to sit immediately after the previous section's closing dash with
 * no blank line in between (e.g. "Victory Road - Surfing" is directly
 * followed by "All Floors with water", whose header would otherwise look
 * identical to a boxed location header).
 */
function findLocationHeaders(lines: string[]): BoxedHeader[] {
  const candidates: BoxedHeader[] = [];
  for (let i = 1; i < lines.length - 1; i++) {
    if (isDashLine(lines[i - 1]) && !isBlank(lines[i]) && !isDashLine(lines[i]) && isDashLine(lines[i + 1])) {
      candidates.push({ title: lines[i].trim(), headerLine: i + 1, bodyStart: i + 2 });
    }
  }
  // The very first boxed header in the file (Route 1) is preceded by the file's
  // legend text, not a blank line, so it's always accepted; every later one must
  // have a blank line before its opening dash to count as a real location.
  return candidates.filter((h, idx) => (idx === 0 || isBlank(lines[h.headerLine - 3]))).filter(isRealHeader);
}

/** Finds every `Title\n----` (dash below only) sub-header inside a body slice, at any nesting depth. */
function findSubHeaders(lines: string[]): BoxedHeader[] {
  const found: BoxedHeader[] = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const prevIsDashOrBlankOrStart = i === 0 || isBlank(lines[i - 1]) || isDashLine(lines[i - 1]);
    if (prevIsDashOrBlankOrStart && !isBlank(lines[i]) && !isDashLine(lines[i]) && isDashLine(lines[i + 1])) {
      found.push({ title: lines[i].trim(), headerLine: i + 1, bodyStart: i + 2 });
    }
  }
  return found.filter(isRealHeader);
}

function parseRows(lines: string[], startLineNo: number): EncounterRow[] {
  const rows: EncounterRow[] = [];
  lines.forEach((rawText, idx) => {
    const text = rawText.trim();
    if (isBlank(text) || isDashLine(text)) return;
    const m = ROW_RE.exec(text);
    assertParse(m, SOURCE_LABEL, startLineNo + idx, rawText, 'encounter row didn\'t match "Species Lvl N-N NN%"');
    const [, speciesRaw, levelRange, chanceRaw, trailingNote] = m;
    const flags: string[] = [];
    if (speciesRaw.includes("*") || text.includes("%*")) flags.push("shaking grass / rippling water / dust cloud");
    if (trailingNote.trim()) flags.push(trailingNote.trim().replace(/^-\s*/, ""));
    rows.push({
      species: speciesRaw.replace(/\*/g, "").trim(),
      levelRange,
      chance: chanceRaw,
      flags,
    });
  });
  return rows;
}

/**
 * Most locations nest exactly one level of method sub-headers (Normal Grass,
 * Surfing, Fishing, ...). A few nest a further level (Relic Castle: floor ->
 * named room). `findSubHeaders` finds every such header within a location's
 * body in one flat pass regardless of depth, so this walks that flat list
 * with a shared cursor: a header whose next sibling starts at or before where
 * its own body would begin has no rows of its own — it's a parent, and its
 * children are consumed recursively — otherwise it's a leaf and owns the rows
 * up to the next header (or the end of the section).
 */
function buildMethods(headers: BoxedHeader[], lines: string[], cursor: { i: number }, sectionEndLine: number, namePrefix: string | null): EncounterMethod[] {
  const methods: EncounterMethod[] = [];

  while (cursor.i < headers.length && headers[cursor.i].headerLine < sectionEndLine) {
    const h = headers[cursor.i];
    cursor.i++;
    const label = namePrefix ? `${namePrefix} - ${h.title}` : h.title;
    const nextHeaderLine = cursor.i < headers.length ? headers[cursor.i].headerLine : sectionEndLine;

    if (nextHeaderLine <= h.bodyStart) {
      methods.push(...buildMethods(headers, lines, cursor, sectionEndLine, label));
    } else {
      const rowEndLine = Math.min(nextHeaderLine - 2, sectionEndLine - 1);
      const rowLines = lines.slice(h.bodyStart - 1, rowEndLine);
      methods.push({ method: label, rows: parseRows(rowLines, h.bodyStart) });
    }
  }

  return methods;
}

export function parseWildEncounters(file: SourceFile): LocationEncounters[] {
  const locationHeaders = findLocationHeaders(file.lines);
  assertParse(locationHeaders.length > 5, SOURCE_LABEL, 1, "", `expected many locations, found ${locationHeaders.length}`);

  return locationHeaders.map((loc, i) => {
    const bodyEndLine = i + 1 < locationHeaders.length ? locationHeaders[i + 1].headerLine - 2 : file.lines.length + 1;
    const bodyLines = file.lines.slice(loc.bodyStart - 1, bodyEndLine - 1);

    const subHeaders = findSubHeaders(bodyLines);
    let methods = buildMethods(subHeaders, bodyLines, { i: 0 }, bodyLines.length + 1, null).filter((m) => m.rows.length > 0);

    // Some locations (e.g. "Desert Resort - Entrance") list encounter rows directly
    // under the location header with no named method sub-section at all.
    if (methods.length === 0) {
      const hasRowLikeContent = bodyLines.some((l) => !isBlank(l) && !isDashLine(l));
      assertParse(hasRowLikeContent, SOURCE_LABEL, loc.headerLine, loc.title, `location "${loc.title}" has no encounter content at all`);
      methods = [{ method: "Land", rows: parseRows(bodyLines, loc.bodyStart) }];
    }

    return { location: loc.title, methods };
  });
}
