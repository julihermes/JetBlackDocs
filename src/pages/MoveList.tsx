import { useMemo, useState } from "preact/hooks";
import { Link } from "wouter-preact";
import { PageHeader } from "../components/PageHeader";
import { SearchBox } from "../components/SearchBox";
import { DamageClassIcon, DamageClassLabel, type DamageClass } from "../components/DamageClassIcon";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import { matches } from "../lib/filter";
import { useInitialQuery } from "../lib/useInitialQuery";
import { typeBg } from "../lib/typeColor";
import type { MoveEntry } from "../lib/types";
import styles from "./MoveList.module.css";

export function MoveList() {
  const state = useData<MoveEntry[]>(() => import("../data/moves.generated.json"));
  const [query, setQuery] = useState(useInitialQuery());

  const filtered = useMemo(() => {
    if (state.status !== "ready") return [];
    const list = [...state.data].sort((a, b) => a.name.localeCompare(b.name));
    if (!query.trim()) return list;
    return list.filter((m) => matches(m.name, query) || m.learnedBy.some((p) => matches(p, query)));
  }, [state, query]);

  return (
    <main className="page">
      <PageHeader eyebrow="DEPARTURE" title="MOVES" subtitle="Every move usable in JetBlack — vanilla Black stats where untouched, rebalanced or brand-new where documented." />

      <SearchBox value={query} onInput={setQuery} placeholder="Search a move or a Pokémon that learns one…" resultCount={state.status === "ready" ? filtered.length : undefined} />

      {state.status === "error" && <DataError label="the move list" />}
      {state.status === "loading" && <EmptyState>Loading moves…</EmptyState>}
      {state.status === "ready" && filtered.length === 0 && <EmptyState>No move matches “{query}”.</EmptyState>}

      <div className={styles.grid} style={{ marginTop: 16 }}>
        {state.status === "ready" &&
          filtered.map((m) => (
            <Link href={`/moves/${encodeURIComponent(m.name.toLowerCase())}`} className={styles.card} style={{ background: typeBg(m.type) }} key={m.name}>
              <div className={styles.head}>
                <span className={styles.name}>{m.name}</span>
                {m.isNew && <span className="tag tag--amber">new</span>}
                {m.changed && <span className="tag tag--amber">changed</span>}
              </div>
              <div className={styles.meta}>
                <span className={styles.typeLabel}>{m.type}</span>
                <span className={styles.category}>
                  <DamageClassIcon damageClass={m.damageClass as DamageClass} />
                  <DamageClassLabel damageClass={m.damageClass as DamageClass} />
                </span>
              </div>
              <div className={styles.stats}>
                <span>PWR {m.power ?? "—"}</span>
                <span>ACC {m.accuracy ?? "—"}</span>
                <span>PP {m.pp}</span>
              </div>
            </Link>
          ))}
      </div>
    </main>
  );
}
