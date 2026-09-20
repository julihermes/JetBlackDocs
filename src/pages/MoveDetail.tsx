import { useMemo } from "preact/hooks";
import { Link, useParams } from "wouter-preact";
import { TypeBadge } from "../components/TypeBadge";
import { DamageClassIcon, DamageClassLabel, type DamageClass } from "../components/DamageClassIcon";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import { alnumKey } from "../lib/textKey";
import type { MoveEntry } from "../lib/types";
import styles from "./MoveDetail.module.css";

export function MoveDetail() {
  const { name } = useParams<{ name: string }>();
  const state = useData<MoveEntry[]>(() => import("../data/moves.generated.json"));

  const move = useMemo(() => {
    if (state.status !== "ready") return undefined;
    const target = decodeURIComponent(name ?? "");
    // Cross-links use whatever spelling the hack's own docs use for a move
    // (e.g. "PoisonPowder"), which can differ from PokéAPI's canonical name
    // ("Poison Powder") — fall back to an alphanumeric-only match, same as
    // the pipeline's own hack-doc-to-vanilla-name matching.
    return state.data.find((m) => m.name.toLowerCase() === target.toLowerCase()) ?? state.data.find((m) => alnumKey(m.name) === alnumKey(target));
  }, [state, name]);

  if (state.status === "error") return <main className="page"><DataError label="the move list" /></main>;
  if (state.status === "loading") return <main className="page"><EmptyState>Loading…</EmptyState></main>;
  if (!move) return <main className="page"><EmptyState>No move named “{name}” — check the spelling.</EmptyState></main>;

  return (
    <main className="page">
      <Link href="/moves" className={styles.back}>
        ← Back to Moves
      </Link>

      <div className={styles.headRow}>
        <div>
          <h1 className="page-title" style={{ fontSize: 26 }}>{move.name}</h1>
          <div className={styles.typeRow}>
            <TypeBadge type={move.type} />
            <span className={styles.categoryTag}>
              <DamageClassIcon damageClass={move.damageClass as DamageClass} />
              <DamageClassLabel damageClass={move.damageClass as DamageClass} />
            </span>
            {move.isNew && <span className="tag tag--amber">new in JetBlack</span>}
            {move.changed && <span className="tag tag--amber">changed by JetBlack</span>}
          </div>
        </div>
      </div>

      {move.flavorText && <p className={styles.flavorText}>“{move.flavorText}”</p>}

      <div className={styles.panel}>
        <p className="section-title" style={{ marginTop: 0 }}>Stats</p>
        <div className={styles.statsGrid}>
          <div>
            <span className={styles.statLabel}>Power</span>
            <span className={styles.statValue}>{move.power ?? "—"}</span>
          </div>
          <div>
            <span className={styles.statLabel}>Accuracy</span>
            <span className={styles.statValue}>{move.accuracy ?? "—"}</span>
          </div>
          <div>
            <span className={styles.statLabel}>PP</span>
            <span className={styles.statValue}>{move.pp}</span>
          </div>
        </div>
        {move.effect && <p className={styles.effect}>{move.effect}</p>}
      </div>

      {move.changed && (
        <div className={styles.panel}>
          <p className="section-title" style={{ marginTop: 0 }}>Changed by JetBlack</p>
          {move.fieldChanges.length > 0 && (
            <div className={styles.diffList}>
              {move.fieldChanges.map((c, i) => (
                <span className={styles.diffItem} key={i}>
                  {c.field}: {c.from && <span className={styles.diffFrom}>{c.from}</span>} <span className={styles.diffTo}>{c.to}</span>
                </span>
              ))}
            </div>
          )}
          {move.changeNotes.length > 0 && (
            <ul className={styles.noteList} style={{ marginTop: move.fieldChanges.length > 0 ? 10 : 0 }}>
              {move.changeNotes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className={styles.panel}>
        <p className="section-title" style={{ marginTop: 0 }}>Learned by</p>
        {move.learnedBy.length === 0 && <EmptyState>No documented Pokémon learn {move.name} in this build.</EmptyState>}
        <div className={styles.learnedByGrid}>
          {move.learnedBy.map((species) => (
            <Link key={species} href={`/pokedex/${encodeURIComponent(species.toLowerCase())}`} className={styles.speciesLink}>
              {species}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
