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

export function TypeBadge({ type }: { type: string }) {
  const key = type.trim().toLowerCase();
  const known = KNOWN_TYPES.has(key);
  return (
    <span
      className="tag"
      style={known ? { color: `var(--type-${key})`, borderColor: `var(--type-${key})`, background: "transparent" } : undefined}
    >
      {type}
    </span>
  );
}
