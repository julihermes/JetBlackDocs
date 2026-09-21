import type { ItemRef } from "../lib/types";
import { itemSpriteUrl } from "../lib/sprites";
import styles from "./ItemIcon.module.css";

/**
 * Every TM shares one generic disc sprite upstream, so machines are drawn here
 * instead — a disc tinted with the taught move's type, the way the games colour
 * them, which also keeps them consistent with the Moves page.
 */
function MachineDisc({ item, size }: { item: ItemRef; size: number }) {
  const color = item.moveType ? `var(--type-${item.moveType})` : "var(--text-dim)";
  return (
    <span className={styles.disc} style={{ width: size, height: size, background: color }} aria-hidden="true">
      <span className={styles.discHole} />
    </span>
  );
}

export function ItemIcon({ item, size = 28 }: { item: ItemRef; size?: number }) {
  if (item.machine) return <MachineDisc item={item} size={size} />;
  if (!item.slug) return <span className={styles.placeholder} style={{ width: size, height: size }} aria-hidden="true" />;
  return (
    <img
      src={itemSpriteUrl(item.slug)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className={styles.sprite}
      onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = "hidden")}
    />
  );
}
