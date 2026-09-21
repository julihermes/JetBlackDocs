import { useMemo } from "preact/hooks";
import { Link, useParams } from "wouter-preact";
import { StatBars } from "../components/StatBars";
import { TypeBadge } from "../components/TypeBadge";
import { DamageClassIcon, type DamageClass } from "../components/DamageClassIcon";
import { Tabs } from "../components/Tabs";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import { spriteUrl } from "../lib/sprites";
import { alnumKey } from "../lib/textKey";
import type { EvolutionEdge, EvolutionLookup, MoveEntry, PokemonEntry, SpeciesEncounterRef, SpeciesTrainerRef, TmEntry } from "../lib/types";
import styles from "./PokemonDetail.module.css";

function findByName(list: PokemonEntry[], name: string) {
  return list.find((p) => p.name.toLowerCase() === name.toLowerCase());
}

function GenderRatio({ genderRate }: { genderRate: number }) {
  if (genderRate === -1) return <span className={styles.genderGenderless}>Genderless</span>;
  const femalePct = (genderRate / 8) * 100;
  const malePct = 100 - femalePct;
  return (
    <div className={styles.genderRow}>
      <div className={styles.genderBar}>
        <div className={styles.genderMale} style={{ width: `${malePct}%` }} />
        <div className={styles.genderFemale} style={{ width: `${femalePct}%` }} />
      </div>
      <span className={styles.genderLabel}>
        ♂ {malePct.toFixed(1)}% · ♀ {femalePct.toFixed(1)}%
      </span>
    </div>
  );
}

function EvoLink({ edge, all, caption }: { edge: EvolutionEdge; all: PokemonEntry[]; caption: string }) {
  const target = findByName(all, edge.species);
  return (
    <Link href={`/pokedex/${encodeURIComponent(edge.species.toLowerCase())}`} className={styles.evoLine}>
      {target && <img src={spriteUrl(target.dexNumber)} alt="" className={styles.evoSprite} />}
      <span>
        <span className={styles.evoName}>
          {edge.species}
          {edge.changed && (
            <span className="tag tag--amber" style={{ marginLeft: 6 }}>
              changed by JetBlack
            </span>
          )}
        </span>
        <span className={styles.evoCondition}>
          {caption} — {edge.method}
        </span>
      </span>
    </Link>
  );
}

export function PokemonDetail() {
  const { name } = useParams<{ name: string }>();
  const pokemonState = useData<PokemonEntry[]>(() => import("../data/pokemon.generated.json"));
  const encountersState = useData<Record<string, SpeciesEncounterRef[]>>(() => import("../data/encounters-by-species.generated.json"));
  const trainersState = useData<Record<string, SpeciesTrainerRef[]>>(() => import("../data/trainers-by-species.generated.json"));
  const evolutionState = useData<EvolutionLookup>(() => import("../data/evolution-lookup.generated.json"));
  const movesState = useData<MoveEntry[]>(() => import("../data/moves.generated.json"));
  const tmState = useData<Record<string, TmEntry[]>>(() => import("../data/tm-compatibility.generated.json"));

  const movesByKey = useMemo(() => {
    if (movesState.status !== "ready") return new Map<string, MoveEntry>();
    return new Map(movesState.data.map((m) => [alnumKey(m.name), m]));
  }, [movesState]);

  const pokemon = useMemo(() => {
    if (pokemonState.status !== "ready") return undefined;
    return findByName(pokemonState.data, decodeURIComponent(name ?? ""));
  }, [pokemonState, name]);

  if (pokemonState.status === "error") return <main className="page"><DataError label="the Pokédex" /></main>;
  if (pokemonState.status === "loading") return <main className="page"><EmptyState>Loading…</EmptyState></main>;
  if (!pokemon) return <main className="page"><EmptyState>No entry named “{name}” — check the spelling.</EmptyState></main>;

  const tmCompatibility = tmState.status === "ready" ? tmState.data[pokemon.name] ?? [] : [];
  const encounters = encountersState.status === "ready" ? encountersState.data[pokemon.name] ?? [] : [];
  const trainerUses = trainersState.status === "ready" ? trainersState.data[pokemon.name] ?? [] : [];
  const evoEntry = evolutionState.status === "ready" ? evolutionState.data[pokemon.name] : undefined;
  const allPokemon = pokemonState.status === "ready" ? pokemonState.data : [];
  const hasEvolution = Boolean(evoEntry && (evoEntry.evolvesFrom || evoEntry.evolvesTo.length > 0));
  const hasChangedEvolution = Boolean(evoEntry?.evolvesFrom?.changed || evoEntry?.evolvesTo.some((e) => e.changed));

  return (
    <main className="page">
      <Link href="/pokedex" className={styles.back}>
        ← Back to Pokédex
      </Link>

      <div className={styles.headRow}>
        <img src={spriteUrl(pokemon.dexNumber)} alt="" className={styles.headSprite} />
        <div>
          <span className={styles.dexNo}>#{String(pokemon.dexNumber).padStart(3, "0")}</span>
          <h1 className="page-title" style={{ fontSize: 26, marginTop: 2 }}>{pokemon.name}</h1>
          <div className={styles.typeRow}>
            {pokemon.types.map((t) => (
              <TypeBadge type={t} key={t} />
            ))}
          </div>
          {pokemon.genus && <span className={styles.genus}>{pokemon.genus}</span>}
        </div>
      </div>

      {!pokemon.obtainable && (
        <p className={styles.obtainabilityWarning}>
          No documented wild encounter, gift, or breeding path found for {pokemon.name} in this build — it may not
          actually be obtainable, even though its data is fully documented for reference.
        </p>
      )}

      <Tabs
        tabs={[
          {
            label: "Stats",
            content: (
              <>
                {pokemon.flavorText && <p className={styles.flavorText}>“{pokemon.flavorText}”</p>}

                <div className={styles.panel} style={{ marginTop: pokemon.flavorText ? undefined : 0 }}>
                  <p className="section-title" style={{ marginTop: 0 }}>Species info</p>
                  <div className={styles.speciesGrid}>
                    <div>
                      <span className={styles.speciesLabel}>Height</span>
                      <span className={styles.speciesValue}>{pokemon.heightM.toFixed(1)} m</span>
                    </div>
                    <div>
                      <span className={styles.speciesLabel}>Weight</span>
                      <span className={styles.speciesValue}>{pokemon.weightKg.toFixed(1)} kg</span>
                    </div>
                    <div>
                      <span className={styles.speciesLabel}>Catch rate</span>
                      <span className={styles.speciesValue}>{pokemon.catchRate}</span>
                    </div>
                    <div>
                      <span className={styles.speciesLabel}>Hatch cycle</span>
                      <span className={styles.speciesValue}>{pokemon.hatchSteps} steps</span>
                    </div>
                  </div>
                  <div className={styles.speciesSecondRow}>
                    <GenderRatio genderRate={pokemon.genderRate} />
                    <div className={styles.eggGroupRow}>
                      {pokemon.eggGroups.map((g) => (
                        <span className="tag tag--teal" key={g}>
                          {g.replace(/-/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
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

                <div className={styles.panel}>
                  <p className="section-title" style={{ marginTop: 0 }}>Base stats</p>
                  <StatBars stats={pokemon.stats} vanilla={pokemon.vanillaStats} />
                  {pokemon.statChangeNote && !pokemon.hasMultipleFormes && (
                    <p style={{ marginTop: 10, fontSize: 12, color: "var(--text-dim)" }}>{pokemon.statChangeNote}</p>
                  )}
                  {pokemon.hasMultipleFormes && (
                    <p style={{ marginTop: 10, fontSize: 12, color: "var(--text-dim)" }}>
                      This species has forme-specific stats — the figures above are one representative forme; see
                      notes below for the rest.
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
              </>
            ),
          },
          {
            label: "Learnset",
            content: (
              <>
                <div className={styles.panel} style={{ marginTop: 0 }}>
                  <p className="section-title" style={{ marginTop: 0 }}>Level-up learnset</p>
                  <table className={styles.learnTable}>
                    <thead>
                      <tr>
                        <th>Lv.</th>
                        <th>Move</th>
                        <th>Stats</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pokemon.learnset.map((m, i) => {
                        const move = movesByKey.get(alnumKey(m.move));
                        return (
                          <tr key={i}>
                            <td className={styles.levelCell}>{m.level}</td>
                            <td>
                              <span className={styles.moveCell}>
                                <Link href={`/moves/${encodeURIComponent(m.move.toLowerCase())}`}>{m.move}</Link>
                                {move && <TypeBadge type={move.type} />}
                                {move && <DamageClassIcon damageClass={move.damageClass as DamageClass} />}
                                {m.isNewMove && <span className="tag tag--amber">new</span>}
                                {move?.changed && <span className="tag tag--amber">changed</span>}
                              </span>
                            </td>
                            <td className={styles.moveStatsCell}>{move ? `${move.power ?? "—"} / ${move.accuracy ?? "—"} / ${move.pp}` : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {tmCompatibility.length > 0 && (
                  <div className={styles.panel}>
                    <p className="section-title" style={{ marginTop: 0 }}>Compatible TMs &amp; HMs</p>
                    <div className={styles.tmGrid}>
                      {tmCompatibility.map((tm) => (
                        <Link key={tm.tm} href={`/moves/${encodeURIComponent(tm.move.toLowerCase())}`} className={styles.tmCell}>
                          <span className={styles.tmNumber}>{tm.tm}</span>
                          <span className={styles.tmMove}>{tm.move}</span>
                          {tm.addedByHack && <span className="tag tag--amber">added</span>}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ),
          },
          {
            label: "Evolution",
            content: hasEvolution ? (
              <div className={styles.panel} style={{ marginTop: 0 }}>
                {evoEntry!.evolvesFrom && <EvoLink edge={evoEntry!.evolvesFrom} all={allPokemon} caption="Evolves from" />}
                {evoEntry!.evolvesTo.map((e) => (
                  <EvoLink key={e.species} edge={e} all={allPokemon} caption="Evolves into" />
                ))}
                {hasChangedEvolution && (
                  <p className={styles.panelNote}>
                    <Link href={`/evolutions?q=${encodeURIComponent(pokemon.name)}`}>See every evolution JetBlack changed →</Link>
                  </p>
                )}
              </div>
            ) : (
              <EmptyState>{pokemon.name} doesn't evolve, and isn't an evolution of anything else.</EmptyState>
            ),
          },
          {
            label: "Locations",
            content: (
              <>
                <div className={styles.panel} style={{ marginTop: 0 }}>
                  <p className="section-title" style={{ marginTop: 0 }}>Where to catch it</p>
                  {encounters.length === 0 && <EmptyState>No wild encounters documented for {pokemon.name}.</EmptyState>}
                  {encounters.map((e, i) => (
                    <Link key={i} href={`/encounters?q=${encodeURIComponent(e.location)}`} className={styles.crossLink}>
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
                    <Link key={i} href={`/trainers?q=${encodeURIComponent(t.trainerName)}`} className={styles.crossLink}>
                      <span className={styles.crossName}>
                        {t.trainerName} <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>· {t.location}</span>
                      </span>
                      <span className={styles.crossMeta}>{t.level ? `Lv.${t.level}` : "—"}</span>
                    </Link>
                  ))}
                </div>
              </>
            ),
          },
        ]}
      />
    </main>
  );
}
