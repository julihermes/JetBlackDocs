import { PageHeader } from "../components/PageHeader";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import type { ChangelogEntry } from "../lib/types";
import styles from "./History.module.css";

export function History() {
  const state = useData<ChangelogEntry[]>(() => import("../data/changelog.generated.json"));

  return (
    <main className="page">
      <PageHeader eyebrow="DEPARTURE" title="VERSION HISTORY" subtitle="What changed in each JetBlack release, most recent first. Every other page already reflects the current v1.7 state." />

      {state.status === "error" && <DataError label="the changelog" />}
      {state.status === "loading" && <EmptyState>Loading…</EmptyState>}

      {state.status === "ready" &&
        state.data.map((entry) => (
          <div className={styles.entry} key={entry.version}>
            <span className={styles.version}>{entry.version}</span>
            <ul className={styles.notes}>
              {entry.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        ))}
    </main>
  );
}
