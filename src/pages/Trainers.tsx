import { useMemo, useState } from "preact/hooks";
import { PageHeader } from "../components/PageHeader";
import { SearchBox } from "../components/SearchBox";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import { matches } from "../lib/filter";
import type { TrainerLocation } from "../lib/types";
import styles from "./Trainers.module.css";
import encStyles from "./Encounters.module.css";

export function Trainers() {
  const state = useData<TrainerLocation[]>(() => import("../data/trainers.generated.json"));
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (state.status !== "ready") return [];
    if (!query.trim()) return state.data;
    return state.data.filter(
      (loc) =>
        matches(loc.location, query) ||
        loc.battles.some((b) => matches(b.trainerName, query) || b.pokemon.some((p) => matches(p.species, query))),
    );
  }, [state, query]);

  const hasQuery = query.trim().length > 0;

  return (
    <main className="page">
      <PageHeader eyebrow="DEPARTURE · VS" title="TRAINERS" subtitle="Every trainer battle by location — gym leaders, rivals, the Elite Four and post-game rematches." />

      <SearchBox value={query} onInput={setQuery} placeholder="Search a trainer, class or a Pokémon…" resultCount={state.status === "ready" ? filtered.length : undefined} />

      <div style={{ marginTop: 16 }}>
        {state.status === "error" && <DataError label="trainer rosters" />}
        {state.status === "loading" && <EmptyState>Loading trainers…</EmptyState>}
        {state.status === "ready" && filtered.length === 0 && <EmptyState>No trainer, class or Pokémon matches “{query}”.</EmptyState>}
        {state.status === "ready" &&
          filtered.map((loc) => (
            <details key={loc.location} className={encStyles.location} open={hasQuery}>
              <summary className={encStyles.summary}>
                <span>
                  <span className={encStyles.locName}>{loc.location}</span>{" "}
                  <span className={encStyles.locMeta}>· {loc.battles.length} battles</span>
                </span>
                <svg className={encStyles.chevron} width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l6 5-6 5" stroke="currentColor" stroke-width="1.6" fill="none" />
                </svg>
              </summary>
              <div className={encStyles.body}>
                {loc.battles.map((battle, i) => (
                  <div className={styles.battle} key={i}>
                    <div className={styles.battleHead}>
                      <span className={styles.trainerName}>{battle.trainerName}</span>
                      {battle.condition && <span className="tag tag--amber">{battle.condition}</span>}
                      {battle.subArea && <span className="tag">{battle.subArea}</span>}
                      {battle.rewardNote && <span className="tag tag--teal">{battle.rewardNote}</span>}
                    </div>
                    {battle.pokemon.map((mon, j) => (
                      <div className={styles.mon} key={j}>
                        <span>
                          <span className={styles.monName}>{mon.species}</span>
                          {mon.note && <span className={styles.monNote}>{mon.note}</span>}
                        </span>
                        <span className={styles.monMeta}>
                          {mon.level ? `Lv.${mon.level}` : "—"}
                          {mon.heldItem ? ` · @${mon.heldItem}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          ))}
      </div>
    </main>
  );
}
