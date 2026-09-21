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
      <PageHeader title="RUN GUIDE" subtitle="Bonus battles, berry vendors, Royal Unova rewards, and the level caps for a Nuzlocke run." />

      {state.status === "error" && <DataError label="run guide info" />}
      {state.status === "loading" && <EmptyState>Loading…</EmptyState>}

      {state.status === "ready" && (
        <>
          <p className="section-title">Bonus item trainers</p>
          <div className={cardStyles.card}>
            {state.data.bonusTrainers.map((t, i) => (
              <div className={cardStyles.listRow} key={i}>
                <span className={cardStyles.listName}>{t.name}</span>
                <span className={cardStyles.listMeta}>
                  {t.location} · {t.reward}
                </span>
              </div>
            ))}
          </div>

          <p className="section-title">Berry vendors</p>
          <div className={cardStyles.card}>
            {state.data.berryVendors.map((v, i) => (
              <div className={cardStyles.listRow} key={i}>
                <span className={cardStyles.listName}>{v.location}</span>
                <span className={cardStyles.listMeta}>{v.kind}</span>
              </div>
            ))}
          </div>

          <p className="section-title">Royal Unova rewards</p>
          <div className={cardStyles.card}>
            {state.data.royalUnovaRewards.map((r) => (
              <div className={cardStyles.listRow} key={r.day}>
                <span className={cardStyles.listName}>{r.day}</span>
                <span className={cardStyles.listMeta}>{r.item}</span>
              </div>
            ))}
          </div>

          <p className="section-title">Nuzlocke level caps</p>
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
        </>
      )}
    </main>
  );
}
