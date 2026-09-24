/**
 * The 17 types that exist in Generation V, in the order the games list them.
 *
 * Fairy is deliberately absent: it arrives in Gen 6, and JetBlack is a Black
 * hack that adds no types. PokeAPI reports *current* typings, so anything
 * sourced from it has to be resolved back to Gen 5 — see `past_types` in
 * pipeline/vanilla-data/README.md. Keeping Fairy out of this one list means a
 * regression shows up as an unstyled badge rather than a convincing pink one.
 */
export const GEN5_TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
];

export const IS_GEN5_TYPE = new Set(GEN5_TYPES);
