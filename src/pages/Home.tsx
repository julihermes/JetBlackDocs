import { Link } from "wouter-preact";
import { PageHeader } from "../components/PageHeader";
import { useData } from "../lib/useData";
import type { BuildManifest, FeaturesData } from "../lib/types";
import styles from "./Home.module.css";

const BOARD: Array<{ path: string; name: string; detail: (m?: BuildManifest) => string }> = [
  { path: "/pokedex", name: "Pokédex", detail: (m) => `${m?.counts.pokemon ?? "…"} species, stats & learnsets` },
  { path: "/encounters", name: "Wild encounters", detail: (m) => `${m?.counts.wildEncounterLocations ?? "…"} locations` },
  { path: "/trainers", name: "Trainer rosters", detail: (m) => `${m?.counts.trainerLocations ?? "…"} locations, gym leaders to E4` },
  { path: "/items", name: "Item locations", detail: () => "Ground items, gifts, mart stock" },
  { path: "/moves", name: "Move changes", detail: (m) => `${m?.counts.moveChanges ?? "…"} moves rebalanced or added` },
  { path: "/evolutions", name: "Evolution changes", detail: (m) => `${m?.counts.evolutions ?? "…"} altered methods` },
  { path: "/legendaries", name: "Legendaries & mythicals", detail: (m) => `${m?.counts.legendaries ?? "…"} encounters` },
  { path: "/nuzlocke", name: "Nuzlocke level caps", detail: () => "Boss-by-boss level ceiling" },
  { path: "/history", name: "Version history", detail: (m) => `${m?.counts.changelog ?? "…"} releases logged` },
];

export function Home() {
  const manifest = useData<BuildManifest>(() => import("../data/manifest.generated.json"));
  const features = useData<FeaturesData>(() => import("../data/features.generated.json"));

  const m = manifest.status === "ready" ? manifest.data : undefined;

  return (
    <main className="page">
      <div className={styles.hero}>
        <PageHeader title="JETBLACK">
          <p className={styles.intro}>
            {features.status === "ready"
              ? features.data.intro[0]
              : "A reference for playing Pokémon JetBlack — every wild encounter, trainer roster, stat change and item move, in one place."}
          </p>
        </PageHeader>
      </div>

      <div className={styles.factsStrip}>
        <div className={styles.fact}>
          <div className={styles.factValue}>v1.7</div>
          <div className={styles.factLabel}>Hack version</div>
        </div>
        <div className={styles.fact}>
          <div className={styles.factValue}>{m?.counts.pokemon ?? "—"}</div>
          <div className={styles.factLabel}>Species documented</div>
        </div>
        <div className={styles.fact}>
          <div className={styles.factValue}>{m?.counts.trainerLocations ?? "—"}</div>
          <div className={styles.factLabel}>Trainer locations</div>
        </div>
        <div className={styles.fact}>
          <div className={styles.factValue}>{m?.counts.wildEncounterLocations ?? "—"}</div>
          <div className={styles.factLabel}>Wild areas</div>
        </div>
      </div>

      <p className="section-title">Sections</p>
      <div className={styles.board}>
        <div className={styles.boardHead}>
          <span>Section</span>
          <span style={{ textAlign: "right" }}>Status</span>
        </div>
        {BOARD.map((b) => (
          <Link key={b.path} href={b.path} className={styles.boardRow}>
            <span className={styles.dest}>
              <span className={styles.destName}>{b.name}</span>
              <span className={styles.destDetail}>{b.detail(m)}</span>
            </span>
            <span className={styles.status}>READY</span>
          </Link>
        ))}
      </div>

      <p className={styles.footerLink}>
        JetBlack is a Pokémon Black rom hack by EstrethAthema.{" "}
        <a href="https://www.pokecommunity.com/threads/introducing-pokemon-jetblack-a-romhack-of-pokemon-black.535562/" target="_blank" rel="noreferrer">
          Official PokéCommunity thread ↗
        </a>
      </p>
    </main>
  );
}
