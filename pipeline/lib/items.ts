import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ItemRef, VanillaItemInfo } from "../types.ts";

/**
 * Item names the doc spells in a way no mechanical rule recovers — mapped to
 * the PokeAPI slug. Same idea as SPECIES_ALIASES in ./species.ts: the doc is
 * hand-written prose, so a short explicit list beats a clever rule.
 */
const ITEM_ALIASES: Record<string, string> = {
  ragecandybar: "rage-candy-bar",
  tinymushroom: "tiny-mushroom",
  deepseatooth: "deep-sea-tooth",
  solarbeam: "solar-beam",
  "hpup": "hp-up",
  "ppup": "pp-up",
};

const MACHINE_RE = /^(TM|HM)(\d{1,3})\s+(.+)$/i;
// The doc marks vanilla mart stock with "[V]" — and once, with a typo, "[V}".
const VANILLA_MARKER_RE = /\s*\[V[\]}]\s*$/i;

export const hasVanillaMarker = (raw: string) => VANILLA_MARKER_RE.test(raw.trim());

export const stripVanillaMarker = (raw: string) => raw.replace(VANILLA_MARKER_RE, "").trim();

/**
 * "RageCandyBar" → "rage-candy-bar", "Choice Band" → "choice-band". The doc
 * writes some names camel-cased and some spaced, so both are split on.
 */
function toSlug(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export class ItemResolver {
  private readonly items: Record<string, VanillaItemInfo>;
  private readonly moveTypes: Map<string, string>;
  /** Move name → the machine that teaches it, so "(Replaces Psychic)" resolves to TM29. */
  private readonly moveMachines = new Map<string, string>();
  /** Every item name the doc used that didn't resolve, for the build's warning. */
  readonly unresolved = new Set<string>();

  constructor() {
    const dir = join(process.cwd(), "pipeline", "vanilla-data");
    this.items = JSON.parse(readFileSync(join(dir, "items.json"), "utf-8"));
    const moves: Record<string, { type: string }> = JSON.parse(readFileSync(join(dir, "moves.json"), "utf-8"));
    this.moveTypes = new Map(Object.entries(moves).map(([name, m]) => [toSlug(name), m.type]));

    // The doc sometimes names a TM by its move alone ("Replaces Psychic" for
    // TM29 Psychic) — the Gen 5 machine list is what turns that back into a TM.
    const tms: Record<string, { tm: string; move: string }[]> = JSON.parse(readFileSync(join(dir, "tm-compatibility.json"), "utf-8"));
    for (const entries of Object.values(tms)) {
      for (const e of entries) if (!this.moveMachines.has(toSlug(e.move))) this.moveMachines.set(toSlug(e.move), e.tm);
    }
  }

  get all(): Record<string, VanillaItemInfo> {
    return this.items;
  }

  /** Resolves a name, or returns null without recording a failure — for callers that have a second thing to try. */
  tryResolve(raw: string): ItemRef | null {
    const name = stripVanillaMarker(raw).replace(/\.$/, "").trim();

    const machineMatch = MACHINE_RE.exec(name);
    const [machine, move] = machineMatch
      ? [`${machineMatch[1].toUpperCase()}${machineMatch[2].padStart(2, "0")}`, machineMatch[3]]
      : [this.moveMachines.get(toSlug(name)), name];

    if (machine) {
      const moveType = this.moveTypes.get(toSlug(move));
      if (!moveType) return null;
      const slug = machine.toLowerCase();
      return { name: `${machine} ${move}`, slug: slug in this.items ? slug : undefined, category: this.items[slug]?.category, machine, moveType };
    }

    const slug = ITEM_ALIASES[name.toLowerCase().replace(/[^a-z0-9]/g, "")] ?? toSlug(name);
    const info = this.items[slug];
    if (!info) return null;
    return { name: info.name, slug, category: info.category, effect: info.effect };
  }

  /**
   * Resolves one of the doc's item names against the vanilla item list. TMs and
   * HMs carry the taught move's type so the site can draw the disc in its
   * colour; an unresolved name is recorded for the build's warning and comes
   * back as a bare name so the row still renders.
   */
  resolve(raw: string): ItemRef {
    const resolved = this.tryResolve(raw);
    if (resolved) return resolved;
    const name = stripVanillaMarker(raw).replace(/\.$/, "").trim();
    this.unresolved.add(name);
    return { name };
  }
}
