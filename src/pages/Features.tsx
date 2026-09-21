import { Link } from "wouter-preact";
import { PageHeader } from "../components/PageHeader";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import type { FeaturesData } from "../lib/types";
import cardStyles from "../components/Card.module.css";
import styles from "./Features.module.css";

// Several bullets open with "As of v1.7, ..." — the version reads better as a
// tag than as the first three words of the sentence.
const SINCE_RE = /^As of (v[\d.]+),\s*/i;

function Bullet({ text }: { text: string }) {
  const m = SINCE_RE.exec(text);
  return (
    <p className={styles.bullet}>
      {m && <span className={styles.since}>{m[1]}</span>}
      {m ? text.slice(m[0].length) : text}
    </p>
  );
}

export function Features() {
  const state = useData<FeaturesData>(() => import("../data/features.generated.json"));

  return (
    <main className="page">
      <PageHeader title="FEATURES" subtitle="Everything JetBlack changes about a playthrough of Black, straight from the hack's own feature list." />

      {state.status === "error" && <DataError label="the feature list" />}
      {state.status === "loading" && <EmptyState>Loading…</EmptyState>}

      {state.status === "ready" && (
        <>
          {state.data.intro.map((p, i) => (
            <p className="page-subtitle" key={i} style={{ margin: "0 0 10px" }}>
              {p}
            </p>
          ))}

          <p className="section-title">What changed</p>
          <div className={styles.grid}>
            {state.data.bullets.map((b, i) => (
              <Bullet key={i} text={b.text} />
            ))}
          </div>

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

          <p style={{ marginTop: 16, fontSize: 13 }}>
            <Link href="/nuzlocke" style={{ color: "var(--teal)" }}>
              Nuzlocke level caps →
            </Link>
          </p>
        </>
      )}
    </main>
  );
}
