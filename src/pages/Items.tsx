import { useMemo, useState } from "preact/hooks";
import { PageHeader } from "../components/PageHeader";
import { SearchBox } from "../components/SearchBox";
import { Tabs } from "../components/Tabs";
import { ItemIcon } from "../components/ItemIcon";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import { matches } from "../lib/filter";
import type { ItemChangeEntry, ItemRef, ItemsData, VanillaItemInfo } from "../lib/types";
import styles from "./Items.module.css";
import cardStyles from "../components/Card.module.css";

/** "held-items" → "Held items" — PokeAPI category slugs are the only labels available. */
const categoryLabel = (slug: string) => slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

function ChangeCard({ entry }: { entry: ItemChangeEntry }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <ItemIcon item={entry.item} size={32} />
        <span className={styles.cardTitle}>
          <span className={styles.itemName}>{entry.item.name}</span>
          <span className={styles.location}>{entry.location}</span>
        </span>
      </div>

      {entry.replaces && (
        <p className={styles.swap}>
          <span className={styles.swapLabel}>replaces</span>
          <span className={styles.swapVanilla}>
            <ItemIcon item={entry.replaces} size={18} />
            {entry.replaces.name}
          </span>
        </p>
      )}
      {entry.giftFrom && <p className={styles.meta}>Gift for defeating {entry.giftFrom}</p>}
      {entry.note && <p className={styles.meta}>{entry.note}</p>}
      {entry.item.effect && <p className={styles.effect}>{entry.item.effect}</p>}
    </div>
  );
}

function ChangesTab({ data }: { data: ItemsData }) {
  const [query, setQuery] = useState("");

  const sections = [
    { title: "Ground items", subtitle: "Pick-ups whose contents the hack swapped out.", rows: data.ground },
    { title: "Gift items", subtitle: "Handed over by a trainer, mostly after beating them.", rows: data.gifts },
    { title: "Hidden items", subtitle: `All replaced by ${data.hiddenItemsReplacedBy}.`, rows: data.hidden },
  ];

  const hit = (e: ItemChangeEntry) =>
    matches(e.item.name, query) || matches(e.location, query) || (e.replaces ? matches(e.replaces.name, query) : false) || (e.giftFrom ? matches(e.giftFrom, query) : false);

  const filtered = sections.map((s) => ({ ...s, rows: s.rows.filter(hit) }));
  const total = filtered.reduce((n, s) => n + s.rows.length, 0);

  return (
    <>
      <SearchBox value={query} onInput={setQuery} placeholder="Search an item or a location…" resultCount={total} />

      {total === 0 && <EmptyState>No changed item matches “{query}”.</EmptyState>}

      {filtered.map(
        (section) =>
          section.rows.length > 0 && (
            <div key={section.title}>
              <p className="section-title">{section.title}</p>
              <p className={styles.sectionNote}>{section.subtitle}</p>
              <div className={styles.grid}>
                {section.rows.map((entry, i) => (
                  <ChangeCard key={i} entry={entry} />
                ))}
              </div>
            </div>
          ),
      )}

      {data.galleryNote && (
        <div>
          <p className="section-title">Castelia Gallery</p>
          <div className={cardStyles.card}>
            <p className={styles.meta} style={{ margin: 0 }}>
              {data.galleryNote}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function MartsTab({ data }: { data: ItemsData }) {
  return (
    <>
      {data.priceChanges.length > 0 && (
        <>
          <p className="section-title" style={{ marginTop: 0 }}>Price changes</p>
          <div className={styles.priceGrid}>
            {data.priceChanges.map((p, i) => (
              <div key={i} className={styles.priceRow}>
                <span>{p.items.join(", ")}</span>
                <span className={styles.price}>${p.price.toLocaleString("en-US")}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="section-title">Mart stock</p>
      <p className={styles.sectionNote}>The second clerk's shelves. Items marked vanilla are stocked in Black too.</p>
      <div className={styles.martGrid}>
        {data.martStock.map((mart) => (
          <div key={mart.location} className={styles.card}>
            <p className={styles.martName}>{mart.location}</p>
            {mart.section && <p className={styles.martSection}>{mart.section}</p>}
            <div className={styles.stockGrid}>
              {mart.items.map((entry, i) => (
                <div key={i} className={`${styles.stockCard} ${entry.vanilla ? styles.stockVanilla : ""}`}>
                  <ItemIcon item={entry.item} size={28} />
                  <span className={styles.stockInfo}>
                    <span className={styles.stockName}>{entry.item.name}</span>
                    <span className={styles.stockTag}>{entry.vanilla ? "vanilla" : "added"}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function CatalogTab({ catalog }: { catalog: Record<string, VanillaItemInfo> }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const entries = useMemo(() => Object.entries(catalog).sort((a, b) => a[1].name.localeCompare(b[1].name)), [catalog]);
  const categories = useMemo(() => [...new Set(entries.map(([, info]) => info.category))].sort(), [entries]);

  const filtered = entries.filter(
    ([, info]) => (!category || info.category === category) && (matches(info.name, query) || matches(info.effect, query) || matches(info.flavorText, query)),
  );

  return (
    <>
      <SearchBox value={query} onInput={setQuery} placeholder="Search any Black item…" resultCount={filtered.length} />

      <select className={styles.select} value={category} onChange={(e) => setCategory((e.target as HTMLSelectElement).value)} aria-label="Filter by category">
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {categoryLabel(c)}
          </option>
        ))}
      </select>

      {filtered.length === 0 && <EmptyState>No item matches “{query}”.</EmptyState>}

      <div className={styles.grid}>
        {filtered.map(([slug, info]) => {
          const ref: ItemRef = { name: info.name, slug };
          return (
            <div key={slug} className={styles.card}>
              <div className={styles.cardHead}>
                <ItemIcon item={ref} size={32} />
                <span className={styles.cardTitle}>
                  <span className={styles.itemName}>{info.name}</span>
                  <span className={styles.location}>{categoryLabel(info.category)}</span>
                </span>
              </div>
              {info.effect && <p className={styles.effect}>{info.effect}</p>}
              <p className={styles.flavor}>{info.flavorText}</p>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function Items() {
  const state = useData<ItemsData>(() => import("../data/items.generated.json"));
  const catalogState = useData<Record<string, VanillaItemInfo>>(() => import("../data/item-info.generated.json"));

  return (
    <main className="page">
      <PageHeader eyebrow="DEPARTURE" title="ITEMS" subtitle="What JetBlack moved, swapped or put on a shelf — and every item Black has, for reference." />

      {state.status === "error" && <DataError label="item locations" />}
      {state.status === "loading" && <EmptyState>Loading items…</EmptyState>}

      {state.status === "ready" && (
        <Tabs
          tabs={[
            { label: "Changes", content: <ChangesTab data={state.data} /> },
            { label: "Marts", content: <MartsTab data={state.data} /> },
            {
              label: "All items",
              content:
                catalogState.status === "ready" ? (
                  <CatalogTab catalog={catalogState.data} />
                ) : catalogState.status === "error" ? (
                  <DataError label="the item catalog" />
                ) : (
                  <EmptyState>Loading the item catalog…</EmptyState>
                ),
            },
          ]}
        />
      )}
    </main>
  );
}
