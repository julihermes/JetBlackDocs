import { Link } from "wouter-preact";
import { PageHeader } from "../components/PageHeader";
import { useData } from "../lib/useData";
import { LINKS, ctaLinks } from "../lib/links";
import type { BuildManifest, ChangelogEntry, FeaturesData } from "../lib/types";
import styles from "./Home.module.css";

// The hack's own screenshots, taken from its Hackdex page and committed here so
// the site serves them itself. Imported rather than dropped in public/ because
// Vite then rewrites the URLs against `base`, which the GitHub Pages
// project-page deploy needs. The first one is the title screen.
import titleShot from "../assets/screens/jetblack-0.png";
const SHOTS = Object.entries(
  import.meta.glob("../assets/screens/jetblack-*.png", {
    eager: true,
    query: "?url",
    import: "default",
  }) as Record<string, string>,
)
  .filter(([path]) => !path.endsWith("jetblack-0.png"))
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url);

const BOARD: Array<{
  path: string;
  name: string;
  detail: (m?: BuildManifest) => string;
}> = [
  {
    path: "/pokedex",
    name: "Pokédex",
    detail: (m) => `${m?.counts.pokemon ?? "…"} species, stats & learnsets`,
  },
  {
    path: "/encounters",
    name: "Wild encounters",
    detail: (m) => `${m?.counts.wildEncounterLocations ?? "…"} locations`,
  },
  {
    path: "/trainers",
    name: "Trainer rosters",
    detail: (m) =>
      `${m?.counts.trainerLocations ?? "…"} locations, gym leaders to E4`,
  },
  {
    path: "/items",
    name: "Item locations",
    detail: () => "Ground items, gifts, mart stock",
  },
  {
    path: "/moves",
    name: "Move changes",
    detail: (m) => `${m?.counts.moveChanges ?? "…"} moves rebalanced or added`,
  },
  {
    path: "/evolutions",
    name: "Evolution changes",
    detail: (m) => `${m?.counts.evolutions ?? "…"} altered methods`,
  },
  {
    path: "/legendaries",
    name: "Legendaries & mythicals",
    detail: (m) => `${m?.counts.legendaries ?? "…"} encounters`,
  },
  {
    path: "/features",
    name: "Feature list",
    detail: (m) =>
      `${m?.counts.features ?? "…"} changes, in the hack's own words`,
  },
  {
    path: "/nuzlocke",
    name: "Nuzlocke level caps",
    detail: () => "Boss-by-boss level ceiling",
  },
  {
    path: "/history",
    name: "Version history",
    detail: (m) => `${m?.counts.changelog ?? "…"} releases logged`,
  },
];

/**
 * The home page sells five things, and each one has a page that proves it. The
 * copy is matched out of the parsed feature list rather than retyped, so it
 * can't drift from the doc — a bullet that stops matching just loses its card.
 */
const HIGHLIGHTS: Array<{ match: RegExp; title: string; href: string }> = [
  {
    match: /^Wild Pokemon are a lot more diverse/i,
    title: "Wilder routes",
    href: "/encounters",
  },
  {
    match: /^All Pokemon have updated Learnsets/i,
    title: "Rebuilt learnsets",
    href: "/pokedex",
  },
  {
    match: /^Trainer rosters have been updated to add/i,
    title: "Tougher rosters",
    href: "/trainers",
  },
  {
    match: /item placements have been shifted/i,
    title: "Items moved earlier",
    href: "/items",
  },
  {
    match: /every Pokemon can be obtainable/i,
    title: "Every Pokémon obtainable",
    href: "/pokedex",
  },
  {
    match: /Gym Leaders can be encountered hanging around/i,
    title: "Gym leader rematches",
    href: "/trainers",
  },
];

export function Home() {
  const manifest = useData<BuildManifest>(
    () => import("../data/manifest.generated.json"),
  );
  const features = useData<FeaturesData>(
    () => import("../data/features.generated.json"),
  );
  const changelog = useData<ChangelogEntry[]>(
    () => import("../data/changelog.generated.json"),
  );

  const m = manifest.status === "ready" ? manifest.data : undefined;
  const bullets = features.status === "ready" ? features.data.bullets : [];
  const highlights = HIGHLIGHTS.map((h) => ({
    ...h,
    text: bullets.find((b) => h.match.test(b.text))?.text,
  })).filter((h): h is typeof h & { text: string } => Boolean(h.text));
  const latest = changelog.status === "ready" ? changelog.data[0] : undefined;
  const ctas = ctaLinks();

  return (
    <main className="page">
      <div className={styles.hero}>
        <img
          src={titleShot}
          alt="Pokémon JetBlack title screen"
          className={styles.titleShot}
        />
        <div className={styles.heroCopy}>
          <PageHeader title="JETBLACK">
            <p className={styles.intro}>
              {features.status === "ready"
                ? features.data.intro[0]
                : "A reference for playing Pokémon JetBlack — every wild encounter, trainer roster, stat change and item move, in one place."}
            </p>
          </PageHeader>

          {ctas.length > 0 && (
            <div className={styles.ctaRow}>
              {ctas.map((l, i) => (
                <a
                  key={l.label}
                  href={l.url!}
                  target="_blank"
                  rel="noreferrer"
                  className={`${styles.cta} ${i === 0 ? styles.ctaPrimary : ""}`}
                >
                  <span className={styles.ctaLabel}>{l.label} ↗</span>
                  <span className={styles.ctaDetail}>{l.detail}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="section-title">Screenshots</p>
      <div className={styles.shots}>
        {SHOTS.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`JetBlack screenshot ${i + 1}`}
            className={styles.shot}
            loading="lazy"
          />
        ))}
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
          <div className={styles.factValue}>
            {m?.counts.trainerLocations ?? "—"}
          </div>
          <div className={styles.factLabel}>Trainer locations</div>
        </div>
        <div className={styles.fact}>
          <div className={styles.factValue}>
            {m?.counts.wildEncounterLocations ?? "—"}
          </div>
          <div className={styles.factLabel}>Wild areas</div>
        </div>
      </div>

      {highlights.length > 0 && (
        <>
          <p className="section-title">What JetBlack changes</p>
          <div className={styles.highlights}>
            {highlights.map((h) => (
              <Link key={h.title} href={h.href} className={styles.highlight}>
                <span className={styles.highlightTitle}>{h.title}</span>
                <p className={styles.highlightText}>{h.text}</p>
              </Link>
            ))}
          </div>
          <p className={styles.highlightMore}>
            <Link href="/features">Read the full feature list →</Link>
          </p>
        </>
      )}

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

      {latest && (
        <>
          <p className="section-title">Latest release</p>
          <div className={styles.release}>
            <div className={styles.releaseHead}>
              <span className={styles.releaseVersion}>{latest.version}</span>
              <Link href="/history" className={styles.releaseLink}>
                All releases →
              </Link>
            </div>
            {latest.notes.slice(0, 2).map((n, i) => (
              <p className={styles.releaseNote} key={i}>
                {n.replace(/^-\s*/, "")}
              </p>
            ))}
          </div>
        </>
      )}

      <div className={styles.footer}>
        <p style={{ margin: 0 }}>
          JetBlack is a Pokémon Black rom hack by{" "}
          {LINKS.author.url ? (
            <a href={LINKS.author.url} target="_blank" rel="noreferrer">
              EstrethAthema ↗
            </a>
          ) : (
            "EstrethAthema"
          )}
          .
        </p>
        <p style={{ margin: 0 }}>
          This site documents the hack; it is not affiliated with Nintendo, Game
          Freak or The Pokémon Company.
        </p>
      </div>
    </main>
  );
}
