import { Fragment } from "preact";
import type { StatBlock } from "../lib/types";
import styles from "./StatBars.module.css";

const STAT_LABELS: Array<[keyof StatBlock, string]> = [
  ["hp", "HP"],
  ["atk", "ATK"],
  ["def", "DEF"],
  ["spa", "SPA"],
  ["spd", "SPD"],
  ["spe", "SPE"],
];

const MAX_STAT = 180;

export function StatBars({ stats, vanilla }: { stats: StatBlock; vanilla?: StatBlock }) {
  const total = stats.hp + stats.atk + stats.def + stats.spa + stats.spd + stats.spe;
  const vanillaTotal = vanilla ? vanilla.hp + vanilla.atk + vanilla.def + vanilla.spa + vanilla.spd + vanilla.spe : null;

  return (
    <div>
      <div className={styles.grid}>
        {STAT_LABELS.map(([key, label]) => {
          const value = stats[key];
          const vanillaValue = vanilla?.[key];
          const buffed = vanillaValue !== undefined && value > vanillaValue;
          return (
            <Fragment key={key}>
              <span className={styles.label}>{label}</span>
              <span className={styles.track}>
                {vanillaValue !== undefined && vanillaValue !== value && (
                  <span className={styles.fillVanilla} style={{ width: `${Math.min(100, (vanillaValue / MAX_STAT) * 100)}%` }} />
                )}
                <span className={`${styles.fill} ${buffed ? styles.fillBuffed : ""}`} style={{ width: `${Math.min(100, (value / MAX_STAT) * 100)}%` }} />
              </span>
              <span className={styles.value}>{value}</span>
            </Fragment>
          );
        })}
      </div>
      <div className={styles.total}>
        <span>BST</span>
        <span className="tabular">
          {vanillaTotal !== null && vanillaTotal !== total ? `${vanillaTotal} → ${total}` : total}
        </span>
      </div>
    </div>
  );
}
