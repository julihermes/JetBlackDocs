import { useMemo, useState } from "preact/hooks";
import { PageHeader } from "../components/PageHeader";
import { SearchBox } from "../components/SearchBox";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import { matches } from "../lib/filter";
import { useInitialQuery } from "../lib/useInitialQuery";
import type { EvolutionEntry } from "../lib/types";
import cardStyles from "../components/Card.module.css";

export function Evolutions() {
  const state = useData<EvolutionEntry[]>(() => import("../data/evolutions.generated.json"));
  const [query, setQuery] = useState(useInitialQuery());

  const bySection = useMemo(() => {
    if (state.status !== "ready") return new Map<string, EvolutionEntry[]>();
    const list = state.data.filter((e) => !query.trim() || matches(e.from, query) || matches(e.to, query));
    const map = new Map<string, EvolutionEntry[]>();
    for (const e of list) map.set(e.section, [...(map.get(e.section) ?? []), e]);
    return map;
  }, [state, query]);

  return (
    <main className="page">
      <PageHeader eyebrow="DEPARTURE" title="EVOLUTION CHANGES" subtitle="Only what JetBlack altered — mostly trade evolutions swapped for level-ups. Everything not listed here evolves as it does in vanilla Black." />

      <SearchBox value={query} onInput={setQuery} placeholder="Search a Pokémon…" />

      {state.status === "error" && <DataError label="evolution changes" />}
      {state.status === "loading" && <EmptyState>Loading…</EmptyState>}

      {state.status === "ready" && bySection.size === 0 && <EmptyState>No Pokémon matches “{query}”.</EmptyState>}

      {[...bySection.entries()].map(([section, entries]) => (
        <div key={section}>
          <p className="section-title">{section}</p>
          <div className={cardStyles.card}>
            {entries.map((e, i) => (
              <div className={cardStyles.listRow} key={i}>
                <span className={cardStyles.listName}>
                  {e.from} → {e.to}
                </span>
                <span className={cardStyles.listMeta}>{e.condition}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
