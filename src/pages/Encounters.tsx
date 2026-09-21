import { useMemo, useState } from "preact/hooks";
import { Link } from "wouter-preact";
import { PageHeader } from "../components/PageHeader";
import { SearchBox } from "../components/SearchBox";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import { matches } from "../lib/filter";
import { useInitialQuery } from "../lib/useInitialQuery";
import { spriteUrl } from "../lib/sprites";
import { baseSpeciesName } from "../lib/species";
import type { LocationEncounters, PokemonEntry } from "../lib/types";
import styles from "./Encounters.module.css";

export function Encounters() {
  const state = useData<LocationEncounters[]>(() => import("../data/wild-encounters.generated.json"));
  const pokemonState = useData<PokemonEntry[]>(() => import("../data/pokemon.generated.json"));
  const [query, setQuery] = useState(useInitialQuery());

  const pokemonByName = useMemo(() => {
    if (pokemonState.status !== "ready") return new Map<string, PokemonEntry>();
    return new Map(pokemonState.data.map((p) => [p.name.toLowerCase(), p]));
  }, [pokemonState]);

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
      <PageHeader title="ENCOUNTERS" subtitle="Wild Pokémon by route and method — search a place (“Route 5”) or a species (“Ducklett”) to find where it turns up." />

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
                      <div className={styles.cardGrid}>
                        {method.rows.map((row, i) => {
                          const mon = pokemonByName.get(baseSpeciesName(row.species).toLowerCase());
                          return (
                            <Link
                              key={i}
                              href={mon ? `/pokedex/${encodeURIComponent(mon.name.toLowerCase())}` : "#"}
                              className={styles.speciesCard}
                            >
                              {mon && <img src={spriteUrl(mon.dexNumber)} alt="" className={styles.cardSprite} />}
                              <div className={styles.cardInfo}>
                                <span className={styles.cardName}>{row.species}</span>
                                <span className={styles.cardMeta}>
                                  Lv.{row.levelRange} · {row.chance}
                                </span>
                                {row.flags.length > 0 && <span className={styles.flagNote}>{row.flags.join(" · ")}</span>}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
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
