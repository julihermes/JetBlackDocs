import { PageHeader } from "../components/PageHeader";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import type { ItemsData } from "../lib/types";
import styles from "./Trainers.module.css";
import cardStyles from "../components/Card.module.css";

function ItemRow({ item, location, note }: { item: string; location: string; note?: string }) {
  return (
    <div className={styles.mon}>
      <span>
        <span className={styles.monName}>{item}</span>
        {note && <span className={styles.monNote}>{note}</span>}
      </span>
      <span className={styles.monMeta}>{location}</span>
    </div>
  );
}

export function Items() {
  const state = useData<ItemsData>(() => import("../data/items.generated.json"));

  return (
    <main className="page">
      <PageHeader eyebrow="DEPARTURE · ITMS" title="ITEMS" subtitle="Ground items, defeat rewards, hidden items and what's new on PokéMart shelves." />

      {state.status === "error" && <DataError label="item locations" />}
      {state.status === "loading" && <EmptyState>Loading items…</EmptyState>}

      {state.status === "ready" && (
        <>
          <p className="section-title">Ground items</p>
          <div className={cardStyles.card}>
            {state.data.ground.map((r, i) => (
              <ItemRow key={i} item={r.item} location={r.location} note={r.note} />
            ))}
          </div>

          <p className="section-title">Gift items</p>
          <div className={cardStyles.card}>
            {state.data.gifts.map((r, i) => (
              <ItemRow key={i} item={r.item} location={r.location} note={r.note} />
            ))}
          </div>

          <p className="section-title">Hidden items</p>
          <p className="page-subtitle" style={{ marginTop: -2, marginBottom: 8 }}>
            All replaced by {state.data.hiddenItemsReplacedBy}.
          </p>
          <div className={cardStyles.card}>
            {state.data.hidden.map((r, i) => (
              <ItemRow key={i} item={r.item} location={r.location} note={r.note} />
            ))}
          </div>

          <p className="section-title">PokéMart stock changes</p>
          {state.data.priceChanges.length > 0 && (
            <div className={cardStyles.card} style={{ marginBottom: 8 }}>
              {state.data.priceChanges.map((p, i) => (
                <p key={i} style={{ fontSize: 13, color: "var(--text-dim)", margin: i === 0 ? 0 : "6px 0 0" }}>
                  {p}
                </p>
              ))}
            </div>
          )}
          {state.data.martStock.map((mart) => (
            <div key={mart.location} className={cardStyles.card} style={{ marginTop: 8 }}>
              <p className={styles.trainerName} style={{ marginBottom: 6 }}>
                {mart.location}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {mart.items.map((it) => (
                  <span className="tag" key={it}>
                    {it}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </main>
  );
}
