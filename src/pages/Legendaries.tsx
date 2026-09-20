import { PageHeader } from "../components/PageHeader";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import type { LegendaryEntry } from "../lib/types";
import cardStyles from "../components/Card.module.css";

function Group({ title, entries }: { title: string; entries: LegendaryEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div>
      <p className="section-title">{title}</p>
      {entries.map((e) => (
        <div className={cardStyles.card} key={e.dexNumber}>
          <div className={cardStyles.row}>
            <span className={cardStyles.title}>
              #{String(e.dexNumber).padStart(3, "0")} {e.name}
            </span>
            <span className={cardStyles.meta}>{e.level ? `Lv.${e.level}` : "Egg"}</span>
          </div>
          <p style={{ fontSize: 13, marginTop: 6, color: "var(--text-dim)" }}>{e.location}</p>
          {e.notes.length > 0 && (
            <p style={{ fontSize: 12, marginTop: 4, color: "var(--text-faint)" }}>{e.notes.join(" ")}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function Legendaries() {
  const state = useData<LegendaryEntry[]>(() => import("../data/legendaries.generated.json") as Promise<{ default: LegendaryEntry[] }>);

  return (
    <main className="page">
      <PageHeader eyebrow="DEPARTURE" title="LEGENDARIES" subtitle="Where to find every legendary and mythical Pokémon, main campaign and post-game." />

      {state.status === "error" && <DataError label="legendary locations" />}
      {state.status === "loading" && <EmptyState>Loading…</EmptyState>}

      {state.status === "ready" && (
        <>
          <Group title="Main campaign" entries={state.data.filter((e) => e.section === "main")} />
          <Group title="Post-game" entries={state.data.filter((e) => e.section === "post-game")} />
        </>
      )}
    </main>
  );
}
