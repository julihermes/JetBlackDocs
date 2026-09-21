import { useMemo, useState } from "preact/hooks";
import { Link } from "wouter-preact";
import { PageHeader } from "../components/PageHeader";
import { SearchBox } from "../components/SearchBox";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import { matches } from "../lib/filter";
import { useInitialQuery } from "../lib/useInitialQuery";
import { spriteUrl } from "../lib/sprites";
import type { EvolutionEntry } from "../lib/types";
import styles from "./Evolutions.module.css";

function Stage({ name, dexNumber }: { name: string; dexNumber?: number }) {
  return (
    <Link href={`/pokedex/${encodeURIComponent(name.toLowerCase())}`} className={styles.stage}>
      {dexNumber && <img src={spriteUrl(dexNumber)} alt="" className={styles.sprite} loading="lazy" />}
      <span className={styles.stageName}>{name}</span>
    </Link>
  );
}

function EvolutionCard({ entry }: { entry: EvolutionEntry }) {
  return (
    <div className={styles.card}>
      <div className={styles.chain}>
        <Stage name={entry.from} dexNumber={entry.fromDexNumber} />
        <span className={styles.arrow} aria-hidden="true">
          →
        </span>
        <Stage name={entry.to} dexNumber={entry.toDexNumber} />
      </div>
      <p className={styles.condition}>{entry.condition}</p>
      {entry.vanillaCondition && (
        <p className={styles.vanilla}>
          <span className={styles.vanillaLabel}>in Black</span>
          <span className={styles.vanillaValue}>{entry.vanillaCondition}</span>
        </p>
      )}
    </div>
  );
}

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

  const total = [...bySection.values()].reduce((n, list) => n + list.length, 0);

  return (
    <main className="page">
      <PageHeader title="EVOLUTION CHANGES" subtitle="Only what JetBlack altered — mostly trade evolutions swapped for level-ups. Everything not listed here evolves as it does in vanilla Black." />

      <SearchBox value={query} onInput={setQuery} placeholder="Search a Pokémon…" resultCount={state.status === "ready" ? total : undefined} />

      {state.status === "error" && <DataError label="evolution changes" />}
      {state.status === "loading" && <EmptyState>Loading…</EmptyState>}

      {state.status === "ready" && bySection.size === 0 && <EmptyState>No Pokémon matches “{query}”.</EmptyState>}

      {[...bySection.entries()].map(([section, entries]) => (
        <div key={section}>
          <p className="section-title">{section}</p>
          <div className={styles.grid}>
            {entries.map((e, i) => (
              <EvolutionCard key={i} entry={e} />
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
