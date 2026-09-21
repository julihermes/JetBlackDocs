import type { SourceFile } from "../lib/source.ts";
import { assertParse } from "../lib/errors.ts";
import { isBlank, isDashLine, paragraphs } from "../lib/text.ts";
import { ItemResolver, hasVanillaMarker, stripVanillaMarker } from "../lib/items.ts";
import type { ItemChangeEntry, ItemsData, MartItem, MartStock, PriceChange } from "../types.ts";

const SOURCE_LABEL = "Item location changes";

const ROW_RE = /^(.+?)\s+-\s+(.+?)(?:\s*\((.+)\))?$/;
// "(Replaces the Oval Stone)", "(replaces TM03 Psyshock)", "(Changed from Shiny Stone gift)".
const REPLACES_RE = /^(?:replaces|changed from)\s+(?:the\s+)?(.+?)(?:\s+gift)?$/i;
// "(Gift from defeating Black Belt Takeshi)" — sometimes with a trailing aside.
const GIFT_RE = /^gift from defeating\s+(.+?)(?:,\s*(.+))?$/i;
// "Repels, Super Repels and Max Repels are now $50, $100 and $150 respectively"
// and "Focus Sash is now $2000" — one statement, one or several item/price pairs.
const PRICE_RE = /\$\s*([\d,]+)/g;
// "Replaces the TinyMushroom in the Stump" — the replaced item, then where it sat.
const IN_CLAUSE_RE = /^(.+?)\s+(in the\s+.+)$/i;
// A mart block can be introduced by a label instead of starting straight into
// items: "Top Section - Left Cashier;".
const MART_SECTION_RE = /;$/;

function parseRows(bodyLines: string[], source: string, startLineNo: number, resolver: ItemResolver): ItemChangeEntry[] {
  const rows: ItemChangeEntry[] = [];
  bodyLines.forEach((text, idx) => {
    const trimmed = text.trim();
    // Skip stray author commentary mixed into a row section (e.g. a trailing
    // "let me know if I missed anything" aside) — real rows always contain " - ".
    if (isBlank(trimmed) || !trimmed.includes(" - ")) return;
    const m = ROW_RE.exec(trimmed);
    assertParse(m, source, startLineNo + idx, text, 'item line didn\'t match "Item - Location (note)"');
    const [, item, location, note] = m;

    const entry: ItemChangeEntry = { item: resolver.resolve(item.trim()), location: location.trim() };
    const trimmedNote = note?.trim();
    if (trimmedNote) {
      const replaces = REPLACES_RE.exec(trimmedNote);
      const gift = GIFT_RE.exec(trimmedNote);
      if (replaces) {
        const replaced = replaces[1].trim();
        const clause = IN_CLAUSE_RE.exec(replaced);
        const withoutClause = clause ? resolver.tryResolve(clause[1]) : null;
        if (withoutClause) {
          entry.replaces = withoutClause;
          entry.note = clause![2].replace(/^./, (c) => c.toUpperCase());
        } else {
          entry.replaces = resolver.resolve(replaced);
        }
      }
      else if (gift) {
        entry.giftFrom = gift[1].trim();
        if (gift[2]) entry.note = gift[2].trim();
      } else entry.note = trimmedNote;
    }
    rows.push(entry);
  });
  return rows;
}

/**
 * "Repels, Super Repels and Max Repels are now $50, $100 and $150 respectively"
 * pairs items with prices positionally; "Focus Sash is now $2000" is the
 * degenerate one-of-each case. A statement whose counts don't line up is kept
 * as a single group so nothing is silently mispriced.
 */
function parsePriceChange(text: string): PriceChange[] {
  const prices = [...text.matchAll(PRICE_RE)].map((m) => Number(m[1].replace(/,/g, "")));
  if (prices.length === 0) return [];

  const subject = text.split(/\s+(?:are|is)\s+(?:all\s+)?now\s+/i)[0];
  const items = subject
    .split(/,|\band\b/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (items.length !== prices.length) return [{ items, price: prices[0] }];
  return items.map((item, i) => ({ items: [item], price: prices[i] }));
}

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

export function parseItems(file: SourceFile): ItemsData {
  const { lines } = file;
  const resolver = new ItemResolver();

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

  const ground = parseRows(sectionBody(lines, groundStart, endAfter(groundStart)), SOURCE_LABEL, groundStart + 1, resolver);
  const gifts = parseRows(sectionBody(lines, giftStart, endAfter(giftStart)), SOURCE_LABEL, giftStart + 1, resolver);

  const hiddenBody = sectionBody(lines, hiddenStart, endAfter(hiddenStart));
  const hiddenIntroLine = hiddenBody.find((l) => !isBlank(l));
  const hiddenRows = hiddenBody.filter((l) => !isBlank(l) && l !== hiddenIntroLine);
  const hidden = parseRows(hiddenRows, SOURCE_LABEL, hiddenStart + 1, resolver);

  // The Castelia Gallery section is prose with no item list under it — the doc
  // never says which items the Harlequin offers.
  const galleryNote =
    galleryStart === -1
      ? ""
      : sectionBody(lines, galleryStart, endAfter(galleryStart))
          .map((l) => l.trim())
          .filter(Boolean)
          .join(" ");

  // --- PokeMart Changes: intro prose, "Pricing Adjustments" freeform, then per-location item lists ---
  const martBody = sectionBody(lines, martStart, endAfter(martStart));
  const martBlocks = paragraphs({ headerText: "", headerLineNumber: martStart, contentLines: martBody.map((text, i) => ({ n: martStart + i + 1, text })) });

  const priceChanges: PriceChange[] = [];
  const martStock: MartStock[] = [];
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
      priceChanges.push(...parsePriceChange(para.map((l) => l.text.trim()).join(" ")));
      continue;
    }
    inPricing = false;
    if (pendingLocation) {
      const bodyLines = para.map((l) => l.text.trim()).filter(Boolean);
      // Shopping Mall Nine's stock is introduced by a "Top Section - Left
      // Cashier;" label, which is a heading for the list, not an item in it.
      const section = MART_SECTION_RE.test(bodyLines[0] ?? "") ? bodyLines.shift()?.replace(MART_SECTION_RE, "").trim() : undefined;
      const items: MartItem[] = bodyLines.map((raw) => ({ item: resolver.resolve(raw), vanilla: hasVanillaMarker(raw) }));
      martStock.push({ location: pendingLocation, section, items });
      pendingLocation = null;
      continue;
    }
    if (para.length === 1) {
      pendingLocation = stripVanillaMarker(firstLine);
    }
  }

  assertParse(martStock.length > 0, SOURCE_LABEL, martStart, "", "no store stock found in PokeMart Changes");

  if (resolver.unresolved.size > 0) {
    console.warn(`\n⚠ ${resolver.unresolved.size} item name(s) in the item doc didn't resolve against the vanilla item list:`);
    for (const name of resolver.unresolved) console.warn(`    ${name}`);
    console.warn("  Add the spelling to ITEM_ALIASES in pipeline/lib/items.ts if it's a typo.\n");
  }

  return {
    ground,
    gifts,
    hidden,
    hiddenItemsReplacedBy: "Dragon Scale",
    martStock,
    priceChanges,
    galleryNote,
  };
}
