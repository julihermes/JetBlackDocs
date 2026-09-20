import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import styles from "./Tabs.module.css";

export function Tabs({ tabs, initial = 0 }: { tabs: Array<{ label: string; content: ComponentChildren }>; initial?: number }) {
  const [active, setActive] = useState(initial);

  return (
    <div>
      <div className={styles.list} role="tablist">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={`${styles.tab} ${i === active ? styles.tabActive : ""}`}
            onClick={() => setActive(i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className={styles.panel} role="tabpanel">
        {tabs[active]?.content}
      </div>
    </div>
  );
}
