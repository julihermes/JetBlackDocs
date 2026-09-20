/** Alphanumeric-only, lowercased key — matches a move name across the spelling variants that show up inconsistently across the hack's own docs (e.g. "PoisonPowder" / "Poison Powder"). Mirrors pipeline/lib/text.ts's alnumKey. */
export function alnumKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}
