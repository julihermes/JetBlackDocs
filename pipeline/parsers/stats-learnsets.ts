import type { SourceFile } from "../lib/source.ts";
import { assertParse } from "../lib/errors.ts";
import { paragraphs, splitIntoBlocks, type Block } from "../lib/text.ts";
import type { LearnsetMove, PokemonEntry, StatBlock, TmEntry } from "../types.ts";

const SOURCE_LABEL = "Stats and Learnsets";
const DEX_HEADER_RE = /^#(\d+)\s+(.+)$/;
const ABILITY_HEADER_RE = /^abilit(?:y|ies):?\s*(.*)$/i;
const STATS_HEADER_RE = /^stats:?\s*(.*)$/i;
const BST_RE = /^(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)\*?$/;
const VANILLA_RE = /^vanilla:\s*(\d+\/\d+\/\d+\/\d+\/\d+\/\d+)\*?$/i;
// The "after vanilla" label is normally "Updated:" but the source has at least one
// typo ("Cosmopolitan:" for Vanillite) — any `Word: BST` line right after a
// "Vanilla:" line is accepted as the updated stats.
const UPDATED_RE = /^[a-z]+:\s*(\d+\/\d+\/\d+\/\d+\/\d+\/\d+)\*?$/i;
const LABELED_BST_RE = /^[a-z][a-z ]*:\s*(\d+\/\d+\/\d+\/\d+\/\d+\/\d+)\*?$/i;
const NO_CHANGE_RE = /^no changes?$/i;
const LEARNSET_HEADER_RE = /^level\s*up\s*(?:learnset|moveset|learnet)s?:?\s*$/i;
const LEARNSET_ROW_RE = /^(\d+)\s*-\s*(.+)$/;

function toStatBlock(bst: string): StatBlock {
  const [hp, atk, def, spa, spd, spe] = bst.split("/").map(Number);
  return { hp, atk, def, spa, spd, spe };
}

type Para = Array<{ n: number; text: string }>;

function parseAbility(para: Para, dexLabel: string): { abilities: string[]; abilityNotes: string[] } {
  const [first, ...rest] = para;
  // The "Ability:" label is normally present, but at least one entry in the source
  // (#509 Purrloin) omits it entirely and starts the paragraph with the ability
  // list directly — so the header is stripped when present, not required.
  const headerMatch = ABILITY_HEADER_RE.exec(first.text.trim());
  const lines = (headerMatch ? [headerMatch[1], ...rest.map((l) => l.text)] : [first.text, ...rest.map((l) => l.text)])
    .map((s) => s.trim())
    .filter(Boolean);
  assertParse(lines.length > 0, SOURCE_LABEL, first.n, first.text, `${dexLabel}: ability block has no content`);

  const [abilityLine, ...noteLines] = lines;
  const abilities = abilityLine
    .split("/")
    .map((a) => a.replace(/\*/g, "").trim())
    .filter(Boolean);
  const abilityNotes = noteLines.filter((l) => !NO_CHANGE_RE.test(l));

  return { abilities, abilityNotes };
}

interface StatGroup {
  stats: StatBlock;
  vanillaStats?: StatBlock;
  statChangeNote?: string;
}

/**
 * Scans a (possibly multi-paragraph, e.g. Standard Form + Zen Mode Form) line
 * list for "Vanilla:"/"Updated:" pairs or plain BST lines, in order. Most
 * species have exactly one such group; a handful of forme-differentiated
 * species (Darmanitan, Deoxys, Castform, ...) have several, in which case the
 * first is kept as the representative `stats` and everything is preserved
 * verbatim in `formesRaw`.
 */
function scanStatGroups(lines: string[]): { groups: StatGroup[]; consumed: Set<number> } {
  const groups: StatGroup[] = [];
  const consumed = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    const vanillaMatch = VANILLA_RE.exec(lines[i]);
    if (vanillaMatch) {
      const updatedMatch = lines[i + 1] ? UPDATED_RE.exec(lines[i + 1]) : null;
      if (updatedMatch) {
        const noteLines: string[] = [];
        let j = i + 2;
        while (j < lines.length && !VANILLA_RE.test(lines[j]) && !BST_RE.test(lines[j]) && !/^(standard|zen mode|[a-z ]+)\s*form(e)?:?$/i.test(lines[j])) {
          if (!NO_CHANGE_RE.test(lines[j])) noteLines.push(lines[j]);
          consumed.add(j);
          j++;
        }
        groups.push({
          stats: toStatBlock(updatedMatch[1]),
          vanillaStats: toStatBlock(vanillaMatch[1]),
          statChangeNote: noteLines.join(" ") || undefined,
        });
        consumed.add(i);
        consumed.add(i + 1);
        i = j - 1;
        continue;
      }
    }

    const bstMatch = BST_RE.exec(lines[i]);
    if (bstMatch) {
      groups.push({ stats: toStatBlock(lines[i].replace("*", "")) });
      consumed.add(i);
      continue;
    }

    // A forme labeled with something other than "Vanilla"/"Updated", e.g.
    // "Standard:  100/77/77/128/128/90" / "Pirouette: 100/128/90/77/77/128" (Meloetta).
    const labeledMatch = LABELED_BST_RE.exec(lines[i]);
    if (labeledMatch) {
      groups.push({ stats: toStatBlock(labeledMatch[1]) });
      consumed.add(i);
    }
  }
  return { groups, consumed };
}

function parseStats(
  para: Para,
  dexLabel: string,
): { stats: StatBlock; vanillaStats?: StatBlock; statChangeNote?: string; hasMultipleFormes: boolean; formesRaw?: string; extraNotes: string[] } {
  const [first, ...rest] = para;
  const headerMatch = STATS_HEADER_RE.exec(first.text.trim());
  const lines = (headerMatch ? [headerMatch[1], ...rest.map((l) => l.text)] : [first.text, ...rest.map((l) => l.text)])
    .map((s) => s.trim())
    .filter(Boolean);
  assertParse(lines.length > 0, SOURCE_LABEL, first.n, first.text, `${dexLabel}: stats block has no content`);

  const { groups, consumed } = scanStatGroups(lines);
  assertParse(groups.length > 0, SOURCE_LABEL, first.n, first.text, `${dexLabel}: couldn't find any BST-shaped line in the stats block`);

  const [primary] = groups;
  if (groups.length === 1) {
    const trailing = lines.filter((l, i) => !consumed.has(i) && !NO_CHANGE_RE.test(l));
    return { ...primary, hasMultipleFormes: false, extraNotes: trailing };
  }

  return {
    ...primary,
    hasMultipleFormes: true,
    formesRaw: lines.join("\n"),
    extraNotes: [],
  };
}

// "Can learn TM83 Work Up via TM (RomHack)", "Now learns TM43 Flame Charge Via
// TM", "Can learn HM03 Surf via HM (SwSh)" — the trailing "via TM"/"via HM" is
// what bounds the move name, otherwise a capitalized "Via TM" gets swallowed
// into it.
const TM_MENTION_RE = /\b(TM|HM)(\d{1,3})\s+(.+?)\s+via\s+(?:TM|HM)\b/gi;
const TM_BOILERPLATE_RE = /(?:Can\s+(?:now\s+)?learn|Now\s+learns)\s+(?:TM|HM)\d{1,3}\s+.+?\s+via\s+(?:TM|HM)(?:\s*\([^)]*\))?\.?/gi;

/**
 * Pulls "Can learn TM33 Reflect via TM (RomHack)" style mentions out of the
 * freeform notes — these are machines the species can't learn in vanilla, so
 * they're merged onto the vanilla compatibility list in pipeline/vanilla-data.ts
 * rather than kept as prose. A note that's nothing but such mentions is dropped
 * entirely (now redundant); one that says something else too is left as-is
 * rather than partially mangled.
 */
function extractTmAdditions(notes: string[]): { tmAdditions: TmEntry[]; notes: string[] } {
  const tmAdditions: TmEntry[] = [];
  const remaining: string[] = [];
  for (const note of notes) {
    const mentions = [...note.matchAll(TM_MENTION_RE)].map((m) => ({
      tm: `${m[1].toUpperCase()}${m[2].padStart(2, "0")}`,
      move: m[3].trim(),
      addedByHack: true,
    }));
    if (mentions.length === 0) {
      remaining.push(note);
      continue;
    }
    tmAdditions.push(...mentions);
    const strippedOfBoilerplate = note.replace(TM_BOILERPLATE_RE, "").trim();
    if (strippedOfBoilerplate) remaining.push(strippedOfBoilerplate);
  }
  return { tmAdditions, notes: remaining };
}

function parseLearnset(para: Para, dexLabel: string): LearnsetMove[] {
  const [first, ...rest] = para;
  assertParse(LEARNSET_HEADER_RE.test(first.text.trim()), SOURCE_LABEL, first.n, first.text, `${dexLabel}: expected a "Level up Learnset:" header`);

  // A handful of forme-differentiated species (Wormadam, ...) repeat the whole
  // learnset once per forme, separated by "[Forme Name]" labels, and Rotom has a
  // one-off "Special - Move/Move/..." forme-exclusive-move line — both skipped
  // here rather than failing the build, since every real row starts with a digit.
  return rest
    .filter((l) => /^\d/.test(l.text.trim()))
    .map((l) => {
      const m = LEARNSET_ROW_RE.exec(l.text.trim());
      assertParse(m, SOURCE_LABEL, l.n, l.text, `${dexLabel}: learnset row didn't match "LEVEL - Move"`);
      const [, levelStr, moveRaw] = m;
      const isNewMove = moveRaw.trim().endsWith("*");
      return { level: Number(levelStr), move: moveRaw.trim().replace(/\*$/, ""), isNewMove };
    });
}

export function parseStatsAndLearnsets(file: SourceFile): PokemonEntry[] {
  const blocks = splitIntoBlocks(file.lines, DEX_HEADER_RE);
  assertParse(blocks.length > 100, SOURCE_LABEL, 1, "", `expected hundreds of Pokemon entries, found ${blocks.length}`);

  return blocks.map((block: Block) => {
    const headerMatch = DEX_HEADER_RE.exec(block.headerText)!;
    const dexNumber = Number(headerMatch[1]);
    const name = headerMatch[2].trim();
    const dexLabel = `#${dexNumber} ${name}`;

    const paras = paragraphs(block);
    assertParse(paras.length >= 3, SOURCE_LABEL, block.headerLineNumber, block.headerText, `${dexLabel}: expected at least 3 paragraphs (ability, stats, learnset)`);

    const { abilities, abilityNotes } = parseAbility(paras[0], dexLabel);

    const learnsetIdx = paras.findIndex((p) => LEARNSET_HEADER_RE.test(p[0]?.text.trim() ?? ""));
    assertParse(learnsetIdx > 1, SOURCE_LABEL, block.headerLineNumber, block.headerText, `${dexLabel}: no "Level up Learnset:" paragraph found`);

    // Most species keep all of their stats info in one paragraph, but a few
    // (Darmanitan's Standard/Zen Mode split) spread it across a couple of
    // paragraphs separated by a blank line — greedily fold in any immediately
    // following paragraph that still looks stats-shaped before giving up to notes.
    const looksStatsy = (p: Para) => {
      const t = p[0]?.text.trim() ?? "";
      return STATS_HEADER_RE.test(t) || VANILLA_RE.test(t) || BST_RE.test(t) || /form(e)?:?\s*$/i.test(t);
    };
    let statsEnd = 2;
    while (statsEnd < learnsetIdx && looksStatsy(paras[statsEnd])) statsEnd++;

    const { stats, vanillaStats, statChangeNote, hasMultipleFormes, formesRaw, extraNotes } = parseStats(paras.slice(1, statsEnd).flat(), dexLabel);

    const noteParagraphs = paras.slice(statsEnd, learnsetIdx).map((p) => p.map((l) => l.text.trim()).join(" "));
    const allNotes = [...extraNotes, ...noteParagraphs].filter(Boolean);
    const { tmAdditions, notes } = extractTmAdditions(allNotes);

    const learnset = parseLearnset(paras[learnsetIdx], dexLabel);

    return {
      dexNumber,
      name,
      types: [], // filled in from static reference data — see pipeline/vanilla-data.ts
      genus: "", // vanilla species info filled in from static reference data — see pipeline/vanilla-data.ts
      heightM: 0,
      weightKg: 0,
      genderRate: -1,
      eggGroups: [],
      catchRate: 0,
      hatchSteps: 0,
      flavorText: "",
      legendary: false,
      abilities,
      abilityNotes,
      stats,
      vanillaStats,
      statChangeNote,
      hasMultipleFormes,
      formesRaw,
      tmAdditions,
      notes,
      learnset,
    };
  });
}
