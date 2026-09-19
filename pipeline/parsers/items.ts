import type { SourceFile } from "../lib/source.ts";
import { assertParse } from "../lib/errors.ts";
import { isBlank, isDashLine, paragraphs } from "../lib/text.ts";
import type { ItemsData } from "../types.ts";

const SOURCE_LABEL = "Item location changes";

const ROW_RE = /^(.+?)\s+-\s+(.+?)(?:\s*\((.+)\))?$/;

function findBoxedHeader(lines: string[], title: RegExp): number {
  for (let i = 1; i < lines.length - 1; i++) {
    if (isDashLine(lines[i - 1]) && title.test(lines[i].trim()) && isDashLine(lines[i + 1])) {
      return i + 2; // first line of the section body
    }
  }
  return -1;
}

function sectionBody(lines: string[], start: number, end: number): string[] {
  return lines.slice(start, end === -1 ? undefined : end);
}

function parseRows(bodyLines: string[], source: string, startLineNo: number) {
  const rows: { item: string; location: string; note?: string }[] = [];
  bodyLines.forEach((text, idx) => {
    const trimmed = text.trim();
    // Skip stray author commentary mixed into a row section (e.g. a trailing
    // "let me know if I missed anything" aside) — real rows always contain " - ".
    if (isBlank(trimmed) || !trimmed.includes(" - ")) return;
    const m = ROW_RE.exec(trimmed);
    assertParse(m, source, startLineNo + idx, text, 'item line didn\'t match "Item - Location (note)"');
    const [, item, location, note] = m;
    rows.push({ item: item.trim(), location: location.trim(), note: note?.trim() });
  });
  return rows;
}

export function parseItems(file: SourceFile): ItemsData {
  const { lines } = file;

  const groundStart = findBoxedHeader(lines, /^Ground Items$/i);
  const giftStart = findBoxedHeader(lines, /^Gift Items$/i);
  const hiddenStart = findBoxedHeader(lines, /^Hidden Items$/i);
  const galleryStart = findBoxedHeader(lines, /^Castelia Gallery$/i);
  const martStart = findBoxedHeader(lines, /^Pokemart Changes$/i);

  assertParse(groundStart !== -1, SOURCE_LABEL, 1, "", '"Ground Items" section not found');
  assertParse(giftStart !== -1, SOURCE_LABEL, 1, "", '"Gift Items" section not found');
  assertParse(hiddenStart !== -1, SOURCE_LABEL, 1, "", '"Hidden Items" section not found');
  assertParse(martStart !== -1, SOURCE_LABEL, 1, "", '"PokeMart Changes" section not found');

  // Each `start` is the first line of a section's body (just past its own boxed
  // header). A section's content ends 3 lines before the *next* section's body
  // starts, to exclude that next section's own "----\nTitle\n----" header trio.
  const boundaries = [groundStart, giftStart, hiddenStart, galleryStart, martStart, lines.length + 3]
    .filter((n) => n !== -1)
    .sort((a, b) => a - b);
  const endAfter = (start: number) => (boundaries.find((b) => b > start) ?? lines.length + 3) - 3;

  const ground = parseRows(sectionBody(lines, groundStart, endAfter(groundStart)), SOURCE_LABEL, groundStart + 1);
  const gifts = parseRows(sectionBody(lines, giftStart, endAfter(giftStart)), SOURCE_LABEL, giftStart + 1);

  const hiddenBody = sectionBody(lines, hiddenStart, endAfter(hiddenStart));
  const hiddenIntroLine = hiddenBody.find((l) => !isBlank(l));
  const hiddenRows = hiddenBody.filter((l) => !isBlank(l) && l !== hiddenIntroLine);
  const hidden = parseRows(hiddenRows, SOURCE_LABEL, hiddenStart + 1);

  // --- PokeMart Changes: intro prose, "Pricing Adjustments" freeform, then per-location item lists ---
  const martBody = sectionBody(lines, martStart, endAfter(martStart));
  const martBlocks = paragraphs({ headerText: "", headerLineNumber: martStart, contentLines: martBody.map((text, i) => ({ n: martStart + i + 1, text })) });

  const priceChanges: string[] = [];
  const martStock: { location: string; items: string[] }[] = [];
  let inPricing = false;
  let pendingLocation: string | null = null;

  // Each mart location is its own "Title\n----" header (dash-below-only, like a
  // wild-encounters method header), which `paragraphs()` splits from its item
  // list into two separate paragraphs (the dash line ends the first one) — so a
  // single-line paragraph is read as a location name, and the paragraph right
  // after it as that location's stock.
  for (const para of martBlocks) {
    const firstLine = para[0]?.text.trim() ?? "";
    if (/^Pricing Adjustments$/i.test(firstLine)) {
      inPricing = true;
      continue;
    }
    if (/^The second mart clerk/i.test(firstLine) || /^-Anything noted/i.test(firstLine)) {
      continue; // intro/legend prose, not structured data
    }
    // The "Pricing Adjustments" intro spans several short paragraphs (each its
    // own price statement) before the first real mart location — keep reading
    // them as long as they mention a price, not just the one right after the header.
    if (inPricing && para.some((l) => l.text.includes("$"))) {
      priceChanges.push(para.map((l) => l.text.trim()).join(" "));
      continue;
    }
    inPricing = false;
    if (pendingLocation) {
      martStock.push({ location: pendingLocation, items: para.map((l) => l.text.trim()).filter(Boolean) });
      pendingLocation = null;
      continue;
    }
    if (para.length === 1) {
      pendingLocation = firstLine;
    }
  }

  assertParse(martStock.length > 0, SOURCE_LABEL, martStart, "", "no store stock found in PokeMart Changes");

  return {
    ground,
    gifts,
    hidden,
    hiddenItemsReplacedBy: "Dragon Scale",
    martStock,
    priceChanges,
  };
}
