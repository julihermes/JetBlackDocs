const KNOWN_TYPES = new Set([
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
  "fairy",
]);

/** Low-alpha tint of a move/species type, for backgrounds — falls back to the plain surface color for an unrecognized type. */
export function typeBg(type: string): string {
  const key = type.trim().toLowerCase();
  if (!KNOWN_TYPES.has(key)) return "var(--surface)";
  return `color-mix(in srgb, var(--type-${key}) 16%, var(--surface))`;
}
