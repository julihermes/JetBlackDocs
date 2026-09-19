import { useMemo, useState } from "preact/hooks";
import { PageHeader } from "../components/PageHeader";
import { SearchBox } from "../components/SearchBox";
import { TypeBadge } from "../components/TypeBadge";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import { matches } from "../lib/filter";
import type { MoveChangesData } from "../lib/types";
import styles from "./MoveChanges.module.css";

export function MoveChanges() {
  const state = useData<MoveChangesData>(() => import("../data/move-changes.generated.json"));
  const [query, setQuery] = useState("");

  const { changed, newMoves } = useMemo(() => {
    if (state.status !== "ready") return { changed: [], newMoves: [] };
    if (!query.trim()) return state.data;
    return {
      changed: state.data.changed.filter((m) => matches(m.name, query)),
      newMoves: state.data.newMoves.filter((m) => matches(m.name, query) || m.learnedBy.some((p) => matches(p, query))),
    };
  }, [state, query]);

  return (
    <main className="page">
      <PageHeader eyebrow="DEPARTURE · MOVE" title="MOVE CHANGES" subtitle="Every move rebalanced from vanilla Black, plus the brand-new moves JetBlack adds and who learns them." />

      <SearchBox value={query} onInput={setQuery} placeholder="Search a move or a Pokémon that learns one…" />

      {state.status === "error" && <DataError label="move changes" />}
      {state.status === "loading" && <EmptyState>Loading moves…</EmptyState>}

      {state.status === "ready" && (
        <>
          <p className="section-title">New moves</p>
          {newMoves.length === 0 && <EmptyState>No new move matches “{query}”.</EmptyState>}
          {newMoves.map((m) => (
            <div className={styles.moveCard} key={m.name}>
              <div className={styles.moveHead}>
                <span className={styles.moveName}>{m.name}</span>
                {m.type && <TypeBadge type={m.type} />}
                {m.version && <span className="tag tag--amber">{m.version}</span>}
                <span className="tag">replaces {m.replaces}</span>
              </div>
              <div className={styles.changeList}>
                {m.power && <span className={styles.changeItem}>PWR {m.power}</span>}
                {m.accuracy && <span className={styles.changeItem}>ACC {m.accuracy}</span>}
                {m.pp && <span className={styles.changeItem}>PP {m.pp}</span>}
                {m.damageCategory && <span className={styles.changeItem}>{m.damageCategory}</span>}
              </div>
              {m.effect && <p className={styles.notes}>{m.effect}</p>}
              {m.learnedBy.length > 0 && (
                <div className={styles.learnedBy}>
                  {m.learnedBy.map((p) => (
                    <span className="tag" key={p}>
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          <p className="section-title">Rebalanced moves</p>
          {changed.length === 0 && <EmptyState>No changed move matches “{query}”.</EmptyState>}
          {changed.map((m) => (
            <div className={styles.moveCard} key={m.name}>
              <div className={styles.moveHead}>
                <span className={styles.moveName}>{m.name}</span>
              </div>
              <div className={styles.changeList}>
                {m.changes.map((c, i) => (
                  <span className={styles.changeItem} key={i}>
                    {c.field}: {c.from && <span className={styles.changeFrom}>{c.from}</span>} <span className={styles.changeTo}>{c.to}</span>
                  </span>
                ))}
              </div>
              {m.notes.length > 0 && <p className={styles.notes}>{m.notes.join(" ")}</p>}
            </div>
          ))}
        </>
      )}
    </main>
  );
}
