import { Link } from "wouter-preact";
import { PageHeader } from "../components/PageHeader";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import type { FeaturesData } from "../lib/types";
import cardStyles from "../components/Card.module.css";
import styles from "./Nuzlocke.module.css";

export function Nuzlocke() {
  const state = useData<FeaturesData>(() => import("../data/features.generated.json"));

  return (
    <main className="page">
      <PageHeader title="RUN GUIDE" subtitle="The level ceiling for every boss on a Nuzlocke run." />

      {state.status === "error" && <DataError label="run guide info" />}
      {state.status === "loading" && <EmptyState>Loading…</EmptyState>}

      {state.status === "ready" && (
        <>
          {state.data.nuzlocke.intro.map((p, i) => (
            <p key={i} className="page-subtitle" style={{ margin: i === 0 ? "0 0 10px" : "6px 0 10px" }}>
              {p}
            </p>
          ))}
          <div className={cardStyles.card}>
            {state.data.nuzlocke.levelCaps.map((c, i) => (
              <div className={styles.capRow} key={i}>
                <span>
                  {c.boss} {c.optional && <span className="tag">optional</span>}
                </span>
                <span className={styles.capLevel}>Lv.{c.level}</span>
              </div>
            ))}
          </div>

          {/* Bonus trainers, berry vendors and the Royal Unova table used to live
              here too; they belong to the feature list and are shown there now. */}
          <p style={{ marginTop: 16, fontSize: 13 }}>
            <Link href="/features" style={{ color: "var(--teal)" }}>
              Bonus trainers, berry vendors and Royal Unova rewards →
            </Link>
          </p>
        </>
      )}
    </main>
  );
}
