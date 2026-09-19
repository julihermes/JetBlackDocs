import { useMemo, useState } from "preact/hooks";
import { PageHeader } from "../components/PageHeader";
import { SearchBox } from "../components/SearchBox";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import { matches } from "../lib/filter";
import type { LocationEncounters } from "../lib/types";
import styles from "./Encounters.module.css";

export function Encounters() {
  const state = useData<LocationEncounters[]>(() => import("../data/wild-encounters.generated.json"));
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (state.status !== "ready") return [];
    if (!query.trim()) return state.data;
    return state.data.filter(
      (loc) => matches(loc.location, query) || loc.methods.some((m) => m.rows.some((r) => matches(r.species, query))),
    );
  }, [state, query]);

  const hasQuery = query.trim().length > 0;

  return (
    <main className="page">
      <PageHeader eyebrow="DEPARTURE · RTES" title="ENCOUNTERS" subtitle="Wild Pokémon by route and method — search a place (“Route 5”) or a species (“Ducklett”) to find where it turns up." />

      <SearchBox value={query} onInput={setQuery} placeholder="Search a route or a Pokémon…" resultCount={state.status === "ready" ? filtered.length : undefined} />

      <div style={{ marginTop: 16 }}>
        {state.status === "error" && <DataError label="wild encounters" />}
        {state.status === "loading" && <EmptyState>Loading routes…</EmptyState>}
        {state.status === "ready" && filtered.length === 0 && <EmptyState>No location or Pokémon matches “{query}”.</EmptyState>}
        {state.status === "ready" &&
          filtered.map((loc) => {
            const totalRows = loc.methods.reduce((n, m) => n + m.rows.length, 0);
            return (
              <details key={loc.location} className={styles.location} open={hasQuery}>
                <summary className={styles.summary}>
                  <span>
                    <span className={styles.locName}>{loc.location}</span>{" "}
                    <span className={styles.locMeta}>· {totalRows} entries</span>
                  </span>
                  <svg className={styles.chevron} width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M6 3l6 5-6 5" stroke="currentColor" stroke-width="1.6" fill="none" />
                  </svg>
                </summary>
                <div className={styles.body}>
                  {loc.methods.map((method) => (
                    <div className={styles.method} key={method.method}>
                      <p className={styles.methodTitle}>{method.method}</p>
                      {method.rows.map((row, i) => (
                        <div className={styles.row} key={i}>
                          <span>
                            <span className={styles.rowName}>{row.species}</span>
                            {row.flags.length > 0 && (
                              <span className={styles.flags}>
                                {row.flags.map((f) => (
                                  <span className="tag" key={f}>
                                    {f}
                                  </span>
                                ))}
                              </span>
                            )}
                          </span>
                          <span className={styles.rowMeta}>
                            Lv.{row.levelRange} · {row.chance}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
      </div>
    </main>
  );
}
