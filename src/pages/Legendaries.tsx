import { useMemo } from "preact/hooks";
import { Link } from "wouter-preact";
import { PageHeader } from "../components/PageHeader";
import { TypeBadge } from "../components/TypeBadge";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import { spriteUrl } from "../lib/sprites";
import type { LegendariesData, LegendaryEntry, PokemonEntry } from "../lib/types";
import styles from "./Legendaries.module.css";

function LegendaryCard({ entry, species }: { entry: LegendaryEntry; species?: PokemonEntry }) {
  return (
    <Link href={`/pokedex/${encodeURIComponent(entry.name.toLowerCase())}`} className={styles.card}>
      <img src={spriteUrl(entry.dexNumber)} alt="" className={styles.sprite} loading="lazy" />
      <div className={styles.body}>
        <div className={styles.head}>
          <span className={styles.dex}>#{String(entry.dexNumber).padStart(3, "0")}</span>
          <span className={styles.name}>{entry.name}</span>
          <span className={styles.level}>{entry.level ? `Lv.${entry.level}` : "Egg"}</span>
        </div>
        {species && (
          <div className={styles.types}>
            {species.types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </div>
        )}
        <p className={styles.location}>
          <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true">
            <path d="M5 1a3.5 3.5 0 0 1 3.5 3.5C8.5 7 5 11 5 11S1.5 7 1.5 4.5A3.5 3.5 0 0 1 5 1Z" stroke="currentColor" stroke-width="1.2" />
            <circle cx="5" cy="4.5" r="1.2" fill="currentColor" />
          </svg>
          {entry.location}
          {entry.unchangedFromVanilla && <span className={styles.vanillaTag}>same as Black</span>}
        </p>
        {entry.notes.map((n, i) => (
          <p className={styles.note} key={i}>
            {n}
          </p>
        ))}
      </div>
    </Link>
  );
}

export function Legendaries() {
  const state = useData<LegendariesData>(() => import("../data/legendaries.generated.json") as Promise<{ default: LegendariesData }>);
  const pokemonState = useData<PokemonEntry[]>(() => import("../data/pokemon.generated.json"));

  const speciesByName = useMemo(() => {
    if (pokemonState.status !== "ready") return new Map<string, PokemonEntry>();
    return new Map(pokemonState.data.map((p) => [p.name.toLowerCase(), p]));
  }, [pokemonState]);

  const groups: { title: string; section: LegendaryEntry["section"] }[] = [
    { title: "Main campaign", section: "main" },
    { title: "Post-game", section: "post-game" },
  ];

  return (
    <main className="page">
      <PageHeader eyebrow="DEPARTURE" title="LEGENDARIES" subtitle="Where to find every legendary and mythical Pokémon, main campaign and post-game." />

      {state.status === "error" && <DataError label="legendary locations" />}
      {state.status === "loading" && <EmptyState>Loading…</EmptyState>}

      {state.status === "ready" && (
        <>
          {groups.map(({ title, section }) => {
            const entries = state.data.entries.filter((e) => e.section === section);
            if (entries.length === 0) return null;
            return (
              <div key={section}>
                <p className="section-title">{title}</p>
                <div className={styles.grid}>
                  {entries.map((e) => (
                    <LegendaryCard key={e.dexNumber} entry={e} species={speciesByName.get(e.name.toLowerCase())} />
                  ))}
                </div>
              </div>
            );
          })}

          {state.data.asides.length > 0 && (
            <div>
              <p className="section-title">Everything else</p>
              {state.data.asides.map((text, i) => (
                <p className={styles.aside} key={i}>
                  {text}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
