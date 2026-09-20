import type { SourceFile } from "../lib/source.ts";
import { assertParse } from "../lib/errors.ts";
import { meaningfulLines, splitIntoBlocks } from "../lib/text.ts";
import type { LegendaryEntry } from "../types.ts";

const SOURCE_LABEL = "Legendary and Mythical locations";
// The level is usually given ("#494 Victini (Lvl 70)") but Phione and Manaphy
// (obtained as an egg, not caught at a fixed level) omit it entirely.
const HEADER_RE = /^#(\d+)\s+(.+?)\s*(?:\(Lvl\.?\s*(\d+)\))?\*{0,2}\s*$/;
const POST_GAME_MARKER = /^-{2,}Post-Game-{2,}$/;

export function parseLegendaries(file: SourceFile): LegendaryEntry[] {
  const postGameLineIndex = file.lines.findIndex((l) => POST_GAME_MARKER.test(l.trim()));

  const blocks = splitIntoBlocks(file.lines, HEADER_RE);
  assertParse(blocks.length > 0, SOURCE_LABEL, 1, "", "no legendary/mythical block found");

  return blocks.map((block) => {
    const m = HEADER_RE.exec(block.headerText)!;
    const [, dexStr, name, levelStr] = m;
    const content = meaningfulLines(block);
    assertParse(
      content.length > 0,
      SOURCE_LABEL,
      block.headerLineNumber,
      block.headerText,
      `"${name}" block has no location line`,
    );

    const [locationLine, ...rest] = content;
    const section: LegendaryEntry["section"] =
      postGameLineIndex !== -1 && block.headerLineNumber > postGameLineIndex + 1 ? "post-game" : "main";

    return {
      dexNumber: Number(dexStr),
      name: name.trim(),
      level: levelStr ? Number(levelStr) : null,
      section,
      location: locationLine.text.trim().replace(/\*+$/, ""),
      notes: rest.map((l) => l.text.trim()),
    };
  });
}
