import { useMemo } from "preact/hooks";
import { Link, useParams } from "wouter-preact";
import { StatBars } from "../components/StatBars";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import type { EvolutionEntry, PokemonEntry, SpeciesEncounterRef, SpeciesTrainerRef } from "../lib/types";
import styles from "./PokemonDetail.module.css";

export function PokemonDetail() {
  const { name } = useParams<{ name: string }>();
  const pokemonState = useData<PokemonEntry[]>(() => import("../data/pokemon.generated.json"));
  const encountersState = useData<Record<string, SpeciesEncounterRef[]>>(() => import("../data/encounters-by-species.generated.json"));
  const trainersState = useData<Record<string, SpeciesTrainerRef[]>>(() => import("../data/trainers-by-species.generated.json"));
  const evolutionsState = useData<EvolutionEntry[]>(() => import("../data/evolutions.generated.json"));

  const pokemon = useMemo(() => {
    if (pokemonState.status !== "ready") return undefined;
    return pokemonState.data.find((p) => p.name.toLowerCase() === decodeURIComponent(name ?? "").toLowerCase());
  }, [pokemonState, name]);

  if (pokemonState.status === "error") return <main className="page"><DataError label="the Pokédex" /></main>;
  if (pokemonState.status === "loading") return <main className="page"><EmptyState>Loading…</EmptyState></main>;
  if (!pokemon) return <main className="page"><EmptyState>No entry named “{name}” — check the spelling.</EmptyState></main>;

  const encounters = encountersState.status === "ready" ? encountersState.data[pokemon.name] ?? [] : [];
  const trainerUses = trainersState.status === "ready" ? trainersState.data[pokemon.name] ?? [] : [];
  const evolvesInto = evolutionsState.status === "ready" ? evolutionsState.data.filter((e) => e.from === pokemon.name) : [];
  const evolvesFrom = evolutionsState.status === "ready" ? evolutionsState.data.filter((e) => e.to === pokemon.name) : [];

  return (
    <main className="page">
      <Link href="/pokedex" className={styles.back}>
        ← Back to Pokédex
      </Link>

      <div className={styles.headRow}>
        <span className={styles.dexNo}>#{String(pokemon.dexNumber).padStart(3, "0")}</span>
        <h1 className="page-title">{pokemon.name}</h1>
      </div>

      <div className={styles.abilityList}>
        {pokemon.abilities.map((a) => (
          <span className="tag tag--teal" key={a}>
            {a}
          </span>
        ))}
      </div>
      {pokemon.abilityNotes.length > 0 && (
        <ul className={styles.noteList} style={{ marginTop: 10 }}>
          {pokemon.abilityNotes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      {(evolvesFrom.length > 0 || evolvesInto.length > 0) && (
        <div className={styles.panel}>
          <p className="section-title" style={{ marginTop: 0 }}>Evolution</p>
          {evolvesFrom.map((e) => (
            <p className={styles.evoLine} key={`from-${e.from}`}>
              {e.from} <span className={styles.evoArrow}>→</span> {pokemon.name} — {e.condition}
            </p>
          ))}
          {evolvesInto.map((e) => (
            <p className={styles.evoLine} key={`into-${e.to}`}>
              {pokemon.name} <span className={styles.evoArrow}>→</span> {e.to} — {e.condition}
            </p>
          ))}
        </div>
      )}

      <div className={styles.panel}>
        <p className="section-title" style={{ marginTop: 0 }}>Base stats</p>
        <StatBars stats={pokemon.stats} vanilla={pokemon.vanillaStats} />
        {pokemon.statChangeNote && !pokemon.hasMultipleFormes && (
          <p style={{ marginTop: 10, fontSize: 12, color: "var(--text-dim)" }}>{pokemon.statChangeNote}</p>
        )}
        {pokemon.hasMultipleFormes && (
          <p style={{ marginTop: 10, fontSize: 12, color: "var(--text-dim)" }}>
            This species has forme-specific stats — the figures above are one representative forme; see notes below for the rest.
          </p>
        )}
      </div>

      {pokemon.notes.length > 0 && (
        <div className={styles.panel}>
          <p className="section-title" style={{ marginTop: 0 }}>Other changes</p>
          <ul className={styles.noteList}>
            {pokemon.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.panel}>
        <p className="section-title" style={{ marginTop: 0 }}>Level-up learnset</p>
        <table className={styles.learnTable}>
          <thead>
            <tr>
              <th>Lv.</th>
              <th>Move</th>
            </tr>
          </thead>
          <tbody>
            {pokemon.learnset.map((m, i) => (
              <tr key={i}>
                <td className={styles.levelCell}>{m.level}</td>
                <td>
                  <span className={styles.moveCell}>
                    {m.move}
                    {m.isNewMove && <span className="tag tag--amber">new</span>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.panel}>
        <p className="section-title" style={{ marginTop: 0 }}>Where to catch it</p>
        {encounters.length === 0 && <EmptyState>No wild encounters documented for {pokemon.name}.</EmptyState>}
        {encounters.map((e, i) => (
          <Link key={i} href="/encounters" className={styles.crossLink}>
            <span className={styles.crossName}>
              {e.location} <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>· {e.method}</span>
            </span>
            <span className={styles.crossMeta}>
              Lv.{e.levelRange} · {e.chance}
            </span>
          </Link>
        ))}
      </div>

      <div className={styles.panel}>
        <p className="section-title" style={{ marginTop: 0 }}>Used by trainers</p>
        {trainerUses.length === 0 && <EmptyState>No trainers use {pokemon.name} in this build.</EmptyState>}
        {trainerUses.map((t, i) => (
          <Link key={i} href="/trainers" className={styles.crossLink}>
            <span className={styles.crossName}>
              {t.trainerName} <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>· {t.location}</span>
            </span>
            <span className={styles.crossMeta}>{t.level ? `Lv.${t.level}` : "—"}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
