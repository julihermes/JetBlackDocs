import { useMemo, useState } from "preact/hooks";
import { PageHeader } from "../components/PageHeader";
import { SearchBox } from "../components/SearchBox";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import { matches } from "../lib/filter";
import type { EvolutionEntry } from "../lib/types";
import trainerStyles from "./Trainers.module.css";
import cardStyles from "../components/Card.module.css";

export function Evolutions() {
  const state = useData<EvolutionEntry[]>(() => import("../data/evolutions.generated.json"));
  const [query, setQuery] = useState("");

  const bySection = useMemo(() => {
    if (state.status !== "ready") return new Map<string, EvolutionEntry[]>();
    const list = state.data.filter((e) => !query.trim() || matches(e.from, query) || matches(e.to, query));
    const map = new Map<string, EvolutionEntry[]>();
    for (const e of list) map.set(e.section, [...(map.get(e.section) ?? []), e]);
    return map;
  }, [state, query]);

  return (
    <main className="page">
      <PageHeader eyebrow="DEPARTURE · EVO" title="EVOLUTIONS" subtitle="Every evolution method changed from vanilla Black — mostly trade evolutions swapped for level-ups." />

      <SearchBox value={query} onInput={setQuery} placeholder="Search a Pokémon…" />

      {state.status === "error" && <DataError label="evolution changes" />}
      {state.status === "loading" && <EmptyState>Loading…</EmptyState>}

      {state.status === "ready" && bySection.size === 0 && <EmptyState>No Pokémon matches “{query}”.</EmptyState>}

      {[...bySection.entries()].map(([section, entries]) => (
        <div key={section}>
          <p className="section-title">{section}</p>
          <div className={cardStyles.card}>
            {entries.map((e, i) => (
              <div className={trainerStyles.mon} key={i}>
                <span className={trainerStyles.monName}>
                  {e.from} → {e.to}
                </span>
                <span className={trainerStyles.monMeta}>{e.condition}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
