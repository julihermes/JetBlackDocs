import type { SourceFile } from "../lib/source.ts";
import { assertParse } from "../lib/errors.ts";
import { isBlank } from "../lib/text.ts";
import type { EvolutionEntry } from "../types.ts";

const SOURCE_LABEL = "Evolution Changes";
const BULLET_RE = /^-\s*(.+?)\s*>\s*(.+?)\s+(at Level .+|when .+|by .+)$/i;
const SECTION_RE = /^([A-Za-z][A-Za-z -]*):\s*$/;

export function parseEvolutions(file: SourceFile): EvolutionEntry[] {
  const entries: EvolutionEntry[] = [];
  let section = "Unova";

  file.lines.forEach((rawText, i) => {
    const n = i + 1;
    const text = rawText.trim();
    if (isBlank(text)) return;

    const sectionMatch = SECTION_RE.exec(text);
    if (sectionMatch) {
      section = sectionMatch[1];
      return;
    }

    if (!text.startsWith("-")) return; // title line, blank, etc.

    const m = BULLET_RE.exec(text);
    assertParse(m, SOURCE_LABEL, n, rawText, `evolution line didn't match the "- From > To <condition>" pattern`);
    const [, from, to, condition] = m;
    entries.push({ section, from: from.trim(), to: to.trim(), condition: condition.trim() });
  });

  assertParse(entries.length > 0, SOURCE_LABEL, 1, "", "no evolution entries were found");
  return entries;
}
