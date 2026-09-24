import { IS_GEN5_TYPE } from "../lib/types5";

export function TypeBadge({ type }: { type: string }) {
  const key = type.trim().toLowerCase();
  const known = IS_GEN5_TYPE.has(key);
  return (
    <span
      className="tag"
      style={known ? { color: `var(--type-${key})`, borderColor: `var(--type-${key})`, background: "transparent" } : undefined}
    >
      {type}
    </span>
  );
}
