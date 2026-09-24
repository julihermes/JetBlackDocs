import { useMemo } from "preact/hooks";
import { Link, useLocation, useSearch } from "wouter-preact";
import { PageHeader } from "../components/PageHeader";
import { SpeciesPicker } from "../components/SpeciesPicker";
import { TypeBadge } from "../components/TypeBadge";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import { spriteUrl } from "../lib/sprites";
import { alnumKey } from "../lib/textKey";
import { formatMultiplier, matchupsFor } from "../lib/typeMatchup";
import { GEN5_TYPES } from "../lib/types5";
import type { ComponentChildren } from "preact";
import type { PokemonEntry, StatBlock, TmEntry, TypeChart } from "../lib/types";
import styles from "./Compare.module.css";

const STATS: Array<[keyof StatBlock, string]> = [
  ["hp", "HP"],
  ["atk", "ATK"],
  ["def", "DEF"],
  ["spa", "SPA"],
  ["spd", "SPD"],
  ["spe", "SPE"],
];

const bst = (s: StatBlock) => s.hp + s.atk + s.def + s.spa + s.spd + s.spe;

function StatCompareRow({
  label,
  a,
  b,
}: {
  label: string;
  a: number;
  b: number;
}) {
  const max = Math.max(a, b, 1);
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <div className={styles.statBars}>
        <span
          className={`${styles.statValue} ${styles.statValueLeft} ${a > b ? styles.statWin : ""}`}
        >
          {a}
        </span>
        <span className={`${styles.track} ${styles.trackLeft}`}>
          <span
            className={`${styles.fill} ${a > b ? styles.fillWin : ""}`}
            style={{ width: `${(a / max) * 100}%` }}
          />
        </span>
        <span className={styles.track}>
          <span
            className={`${styles.fill} ${b > a ? styles.fillWin : ""}`}
            style={{ width: `${(b / max) * 100}%` }}
          />
        </span>
        <span className={`${styles.statValue} ${b > a ? styles.statWin : ""}`}>
          {b}
        </span>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  a,
  b,
}: {
  label: string;
  a: ComponentChildren;
  b: ComponentChildren;
}) {
  const same = typeof a === "string" && a === b;
  return (
    <div className={styles.infoRow}>
      <span
        className={`${styles.infoValue} ${styles.infoValueLeft} ${same ? styles.infoSame : ""}`}
      >
        {a}
      </span>
      <span className={styles.infoLabel}>{label}</span>
      <span className={`${styles.infoValue} ${same ? styles.infoSame : ""}`}>
        {b}
      </span>
    </div>
  );
}

const multClass = (m: number) =>
  m === 0
    ? styles.multImmune
    : m > 1
      ? styles.multWeak
      : m < 1
        ? styles.multResist
        : styles.multNeutral;

const genderText = (rate: number) =>
  rate === -1
    ? "Genderless"
    : `♂ ${(100 - (rate / 8) * 100).toFixed(0)}% · ♀ ${((rate / 8) * 100).toFixed(0)}%`;

// `move` is what the /moves/ route is keyed on; `label` is what the chip shows
// ("TM26 Earthquake"), so a machine number can never leak into the href.
type MoveRef = {
  move: string;
  label?: string;
  levelA?: number;
  levelB?: number;
};

function MoveGroup({
  title,
  moves,
  showLevels,
}: {
  title: string;
  moves: MoveRef[];
  showLevels: boolean;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <div className={styles.diffHead}>
        <span className={styles.diffTitle}>{title}</span>
        <span className={styles.diffCount}>{moves.length}</span>
      </div>
      {moves.length === 0 ? (
        <EmptyState>Nothing here.</EmptyState>
      ) : (
        <div className={styles.moveGrid}>
          {moves.map((m) => (
            <Link
              key={m.move}
              href={`/moves/${encodeURIComponent(m.move.toLowerCase())}`}
              className={styles.move}
            >
              <span className={styles.moveName}>{m.label ?? m.move}</span>
              {showLevels &&
                m.levelA !== undefined &&
                m.levelB !== undefined && (
                  <span className={styles.moveLevels}>
                    {m.levelA} / {m.levelB}
                  </span>
                )}
              {showLevels &&
                m.levelA !== undefined &&
                m.levelB === undefined && (
                  <span className={styles.moveLevels}>Lv.{m.levelA}</span>
                )}
              {showLevels &&
                m.levelB !== undefined &&
                m.levelA === undefined && (
                  <span className={styles.moveLevels}>Lv.{m.levelB}</span>
                )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Splits two named move sets into "only A", "only B" and "both", keyed so a spelling difference can't invent an exclusive. */
function diffMoves(a: Map<string, MoveRef>, b: Map<string, MoveRef>) {
  const onlyA: MoveRef[] = [];
  const onlyB: MoveRef[] = [];
  const both: MoveRef[] = [];
  for (const [key, ref] of a) {
    const other = b.get(key);
    if (other)
      both.push({
        move: ref.move,
        label: ref.label,
        levelA: ref.levelA,
        levelB: other.levelB ?? other.levelA,
      });
    else onlyA.push(ref);
  }
  for (const [key, ref] of b) if (!a.has(key)) onlyB.push(ref);
  return { onlyA, onlyB, both };
}

export function Compare() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);

  const pokemonState = useData<PokemonEntry[]>(
    () => import("../data/pokemon.generated.json"),
  );
  const tmState = useData<Record<string, TmEntry[]>>(
    () => import("../data/tm-compatibility.generated.json"),
  );
  const chartState = useData<TypeChart>(
    () => import("../data/type-chart.generated.json"),
  );

  const all = pokemonState.status === "ready" ? pokemonState.data : [];
  const find = (raw: string | null) =>
    raw
      ? all.find(
          (p) => p.name.toLowerCase() === decodeURIComponent(raw).toLowerCase(),
        )
      : undefined;
  const a = find(params.get("a"));
  const b = find(params.get("b"));

  const setSide = (side: "a" | "b", p: PokemonEntry) => {
    const next = new URLSearchParams(search);
    next.set(side, p.name.toLowerCase());
    navigate(`/compare?${next.toString()}`);
  };

  const levelUp = useMemo(() => {
    if (!a || !b) return null;
    const toMap = (p: PokemonEntry, side: "a" | "b") => {
      const map = new Map<string, MoveRef>();
      for (const e of p.learnset) {
        const key = alnumKey(e.move);
        // A move relearned at a later level keeps the earliest — that's the one that matters.
        if (!map.has(key))
          map.set(key, {
            move: e.move,
            [side === "a" ? "levelA" : "levelB"]: e.level,
          });
      }
      return map;
    };
    return diffMoves(toMap(a, "a"), toMap(b, "b"));
  }, [a, b]);

  const matchups = useMemo(() => {
    if (!a || !b || chartState.status !== "ready") return null;
    return {
      a: matchupsFor(a.types, chartState.data),
      b: matchupsFor(b.types, chartState.data),
    };
  }, [a, b, chartState]);

  const machines = useMemo(() => {
    if (!a || !b || tmState.status !== "ready") return null;
    const toMap = (p: PokemonEntry) => {
      const map = new Map<string, MoveRef>();
      for (const tm of tmState.data[p.name] ?? [])
        map.set(alnumKey(tm.move), {
          move: tm.move,
          label: `${tm.tm} ${tm.move}`,
        });
      return map;
    };
    return diffMoves(toMap(a), toMap(b));
  }, [a, b, tmState]);

  return (
    <main className="page">
      <PageHeader
        title="COMPARE"
        subtitle="Two species side by side — base stats, species data, and which moves only one of them gets."
      />

      {pokemonState.status === "error" && <DataError label="the Pokédex" />}
      {pokemonState.status === "loading" && <EmptyState>Loading…</EmptyState>}

      {pokemonState.status === "ready" && (
        <>
          <div className={styles.pickers}>
            <SpeciesPicker
              all={all}
              selected={a}
              onSelect={(p) => setSide("a", p)}
              placeholder="First Pokémon…"
            />
            <SpeciesPicker
              all={all}
              selected={b}
              onSelect={(p) => setSide("b", p)}
              placeholder="Second Pokémon…"
            />
          </div>

          {(!a || !b) && (
            <p className={styles.hint}>Pick two species to compare them.</p>
          )}

          {a && b && (
            <>
              <div className={styles.sides} style={{ marginTop: 10 }}>
                {[a, b].map((p, i) => (
                  <Link
                    key={i}
                    href={`/pokedex/${encodeURIComponent(p.name.toLowerCase())}`}
                    className={styles.side}
                  >
                    <img
                      src={spriteUrl(p.dexNumber)}
                      alt=""
                      className={styles.sideSprite}
                    />
                    <span className={styles.sideDex}>
                      #{String(p.dexNumber).padStart(3, "0")}
                    </span>
                    <span className={styles.sideName}>{p.name}</span>
                    <span className={styles.sideTypes}>
                      {p.types.map((t) => (
                        <TypeBadge key={t} type={t} />
                      ))}
                    </span>
                  </Link>
                ))}
              </div>

              <div className={styles.panel}>
                <p className="section-title" style={{ marginTop: 0 }}>
                  Base stats
                </p>
                {STATS.map(([key, label]) => (
                  <StatCompareRow
                    key={key}
                    label={label}
                    a={a.stats[key]}
                    b={b.stats[key]}
                  />
                ))}
                <div className={styles.bstRow}>
                  <span
                    className={
                      bst(a.stats) > bst(b.stats) ? styles.statWin : ""
                    }
                  >
                    {bst(a.stats)}
                  </span>
                  <span className={styles.bstLabel}>BST</span>
                  <span
                    className={
                      bst(b.stats) > bst(a.stats) ? styles.statWin : ""
                    }
                  >
                    {bst(b.stats)}
                  </span>
                </div>
              </div>

              <div className={styles.panel}>
                <p className="section-title" style={{ marginTop: 0 }}>
                  Species data
                </p>
                <InfoRow
                  label="Abilities"
                  a={
                    <span className={`${styles.chipRow} ${styles.chipRowLeft}`}>
                      {a.abilities.map((x) => (
                        <span className="tag tag--teal" key={x}>
                          {x}
                        </span>
                      ))}
                    </span>
                  }
                  b={
                    <span className={styles.chipRow}>
                      {b.abilities.map((x) => (
                        <span className="tag tag--teal" key={x}>
                          {x}
                        </span>
                      ))}
                    </span>
                  }
                />
                <InfoRow
                  label="Height"
                  a={`${a.heightM.toFixed(1)} m`}
                  b={`${b.heightM.toFixed(1)} m`}
                />
                <InfoRow
                  label="Weight"
                  a={`${a.weightKg.toFixed(1)} kg`}
                  b={`${b.weightKg.toFixed(1)} kg`}
                />
                <InfoRow
                  label="Catch rate"
                  a={String(a.catchRate)}
                  b={String(b.catchRate)}
                />
                <InfoRow
                  label="Hatch"
                  a={`${a.hatchSteps} steps`}
                  b={`${b.hatchSteps} steps`}
                />
                <InfoRow
                  label="Gender"
                  a={genderText(a.genderRate)}
                  b={genderText(b.genderRate)}
                />
                <InfoRow
                  label="Egg groups"
                  a={
                    <span className={`${styles.chipRow} ${styles.chipRowLeft}`}>
                      {a.eggGroups.map((g) => (
                        <span className="tag" key={g}>
                          {g.replace(/-/g, " ")}
                        </span>
                      ))}
                    </span>
                  }
                  b={
                    <span className={styles.chipRow}>
                      {b.eggGroups.map((g) => (
                        <span className="tag" key={g}>
                          {g.replace(/-/g, " ")}
                        </span>
                      ))}
                    </span>
                  }
                />
              </div>

              {matchups && (
                <div className={styles.panel}>
                  <p className="section-title" style={{ marginTop: 0 }}>
                    Type matchups
                  </p>
                  <div className={styles.matchups}>
                    {GEN5_TYPES.map((t) => (
                      <div className={styles.matchupRow} key={t}>
                        <span
                          className={`${styles.mult} ${styles.multLeft} ${multClass(matchups.a[t])}`}
                        >
                          {formatMultiplier(matchups.a[t])}×
                        </span>
                        <span className={styles.matchupType}>
                          <TypeBadge type={t} />
                        </span>
                        <span
                          className={`${styles.mult} ${multClass(matchups.b[t])}`}
                        >
                          {formatMultiplier(matchups.b[t])}×
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className={styles.matchupLegend}>
                    Damage taken from each attacking type, Gen 5 chart — Steel
                    still resists Dark and Ghost, and there is no Fairy type.
                  </p>
                </div>
              )}

              {levelUp && (
                <div className={styles.panel}>
                  <p className="section-title" style={{ marginTop: 0 }}>
                    Level-up moves
                  </p>
                  <MoveGroup
                    title={`Only ${a.name}`}
                    moves={levelUp.onlyA}
                    showLevels
                  />
                  <MoveGroup
                    title={`Only ${b.name}`}
                    moves={levelUp.onlyB}
                    showLevels
                  />
                  <MoveGroup title="Both" moves={levelUp.both} showLevels />
                </div>
              )}

              {machines && (
                <div className={styles.panel}>
                  <p className="section-title" style={{ marginTop: 0 }}>
                    TMs &amp; HMs
                  </p>
                  <MoveGroup
                    title={`Only ${a.name}`}
                    moves={machines.onlyA}
                    showLevels={false}
                  />
                  <MoveGroup
                    title={`Only ${b.name}`}
                    moves={machines.onlyB}
                    showLevels={false}
                  />
                  <MoveGroup
                    title="Both"
                    moves={machines.both}
                    showLevels={false}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
