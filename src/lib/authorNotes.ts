/**
 * Answers the hack's author gave directly, for questions the documentation
 * doesn't cover. Like src/lib/release.ts, this is one of the few places on the
 * site whose content isn't derived from data-source/ — so each entry names
 * where it came from, and stays here rather than being folded into the parsed
 * notes, which would make it look like the doc said it.
 */
export const OBTAIN_NOTES: Record<string, string> = {
  // EstrethAthema, Discord, 2026-09-24, asked because Rotom has no wild
  // encounter, is not a legendary (so not an Obelisk), and is genderless.
  Rotom: "Trade only — unchanged from vanilla Black, where Rotom cannot be caught.",
};
