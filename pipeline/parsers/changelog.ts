import type { SourceFile } from "../lib/source.ts";
import { assertParse } from "../lib/errors.ts";
import { paragraphs, splitIntoBlocks } from "../lib/text.ts";
import type { ChangelogEntry } from "../types.ts";

const SOURCE_LABEL = "Changelog notes";
const HEADER_RE = /^(?:JetBlack\s+)?[Vv](\d+\.\d+)(\s+Hotfix\d*)?\s+(?:notes|[Cc]hangenotes?)\.?\s*$/;

export function parseChangelog(file: SourceFile): ChangelogEntry[] {
  const blocks = splitIntoBlocks(file.lines, HEADER_RE);
  assertParse(blocks.length > 0, SOURCE_LABEL, 1, "", "no version found in the changelog");

  return blocks.map((block) => {
    const m = HEADER_RE.exec(block.headerText)!;
    const [, majorMinor, hotfix] = m;
    const version = `v${majorMinor}${hotfix ? " " + hotfix.trim() : ""}`;

    const notes = paragraphs(block).map((para) => para.map((l) => l.text.trim()).join(" "));

    return { version, notes };
  });
}
