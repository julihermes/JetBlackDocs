import type { SourceFile } from "../lib/source.ts";
import { assertParse } from "../lib/errors.ts";
import { paragraphs, splitIntoBlocks } from "../lib/text.ts";
import type { LegendariesData, LegendaryEntry } from "../types.ts";

const SOURCE_LABEL = "Legendary and Mythical locations";
// The level is usually given ("#494 Victini (Lvl 70)") but Phione and Manaphy
// (obtained as an egg, not caught at a fixed level) omit it entirely.
const HEADER_RE = /^#(\d+)\s+(.+?)\s*(?:\(Lvl\.?\s*(\d+)\))?\*{0,2}\s*$/;
const POST_GAME_MARKER = /^-{2,}Post-Game-{2,}$/;
const VANILLA_SUFFIX_RE = /\s*-\s*Unchanged from Vanilla\s*$/i;
// Notes are bulleted with a leading "-" or footnoted with "*"/"**".
const NOTE_MARKER_RE = /^[-*]+\s*/;

/**
 * Notes wrap across lines mid-sentence ("... in Shopping Mall Nine" /
 * "is defeated."), so a line without a bullet marker continues the one before
 * it rather than starting a note of its own.
 */
function joinWrappedNotes(lines: string[]): string[] {
  const notes: string[] = [];
  for (const line of lines) {
    if (NOTE_MARKER_RE.test(line) || notes.length === 0) notes.push(line.replace(NOTE_MARKER_RE, "").trim());
    else notes[notes.length - 1] += ` ${line.trim()}`;
  }
  return notes.filter(Boolean);
}

export function parseLegendaries(file: SourceFile): LegendariesData {
  const postGameLineIndex = file.lines.findIndex((l) => POST_GAME_MARKER.test(l.trim()));

  const blocks = splitIntoBlocks(file.lines, HEADER_RE);
  assertParse(blocks.length > 0, SOURCE_LABEL, 1, "", "no legendary/mythical block found");

  // Prose that belongs to the document rather than to the entry it happens to
  // follow: the Obelisks explanation under "---Post-Game---" (which trails
  // Genesect's block) and the God Stone note that closes the file (trailing
  // Manaphy's). Both are separated from the entry's own lines by a blank line.
  const asides: string[] = [];

  const entries = blocks.map((block) => {
    const m = HEADER_RE.exec(block.headerText)!;
    const [, dexStr, name, levelStr] = m;
    const [own, ...trailing] = paragraphs(block);
    assertParse(own?.length > 0, SOURCE_LABEL, block.headerLineNumber, block.headerText, `"${name}" block has no location line`);

    for (const para of trailing) {
      const text = para
        .map((l) => l.text.trim())
        .filter((l) => !POST_GAME_MARKER.test(l))
        .join(" ")
        .trim();
      if (text) asides.push(text);
    }

    const [locationLine, ...rest] = own;
    const rawLocation = locationLine.text.trim().replace(/\*+$/, "");
    const section: LegendaryEntry["section"] =
      postGameLineIndex !== -1 && block.headerLineNumber > postGameLineIndex + 1 ? "post-game" : "main";

    return {
      dexNumber: Number(dexStr),
      name: name.trim(),
      level: levelStr ? Number(levelStr) : null,
      section,
      location: rawLocation.replace(VANILLA_SUFFIX_RE, "").replace(/\.$/, ""),
      unchangedFromVanilla: VANILLA_SUFFIX_RE.test(rawLocation),
      notes: joinWrappedNotes(rest.map((l) => l.text.trim())),
    };
  });

  return { entries, asides };
}
