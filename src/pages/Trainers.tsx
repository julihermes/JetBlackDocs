import { useMemo, useState } from "preact/hooks";
import { Link } from "wouter-preact";
import { PageHeader } from "../components/PageHeader";
import { SearchBox } from "../components/SearchBox";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import { matches } from "../lib/filter";
import { useInitialQuery } from "../lib/useInitialQuery";
import { spriteUrl } from "../lib/sprites";
import { baseSpeciesName } from "../lib/species";
import { resolveClassIcon } from "../lib/trainerClass";
import type { PokemonEntry, TrainerBattle, TrainerLocation } from "../lib/types";
import styles from "./Trainers.module.css";
import encStyles from "./Encounters.module.css";

const isGymLeader = (battle: TrainerBattle) => battle.trainerName.startsWith("Leader ");
const isRival = (battle: TrainerBattle) => /^(Pokemon Trainer )?(Cheren|Bianca)$/i.test(battle.trainerName);
const isEliteFour = (battle: TrainerBattle) => /^Elite\s*(4|Four)\b/i.test(battle.trainerName);
const isChampion = (battle: TrainerBattle) => /^Champion\b/i.test(battle.trainerName);
// N fights under both "Team Plasma N" and "Pokemon Trainer N"; the 45 generic
// grunt battles are not boss fights and stay with their class icon.
const isPlasmaBoss = (battle: TrainerBattle) => /^Team Plasma (?!Grunt)/i.test(battle.trainerName) || /^Pokemon Trainer N$/i.test(battle.trainerName);
// The bosses the level-cap list counts that aren't leaders, rivals or the League.
const isPostGameBoss = (battle: TrainerBattle) => /^(Pokemon Trainer Cynthia|Subway Boss )/i.test(battle.trainerName);
const isImportant = (battle: TrainerBattle) =>
  isGymLeader(battle) || isRival(battle) || isEliteFour(battle) || isChampion(battle) || isPlasmaBoss(battle) || isPostGameBoss(battle);
// Bulbapedia's image host refuses requests that carry a third-party Referer
// (verified: 0/30 icons load with one, 30/30 without), so every portrait and
// class icon has to be requested with referrerPolicy="no-referrer".
const hideOnError = (e: Event) => ((e.currentTarget as HTMLImageElement).style.visibility = "hidden");
const portraitKey = (battle: TrainerBattle) => battle.trainerName.replace(/^(Leader|Champion|Elite\s*4|Elite\s*Four|Pokemon Trainer|Team Plasma|Subway Boss)\s+/i, "");

type CategoryKey = "gymLeaders" | "rivals" | "eliteFour" | "champion" | "teamPlasma" | "postGameBosses";
const CATEGORIES: { key: CategoryKey; label: string; test: (b: TrainerBattle) => boolean }[] = [
  { key: "gymLeaders", label: "Gym leaders", test: isGymLeader },
  { key: "rivals", label: "Rivals", test: isRival },
  { key: "eliteFour", label: "Elite Four", test: isEliteFour },
  { key: "champion", label: "Champion", test: isChampion },
  { key: "teamPlasma", label: "Team Plasma", test: isPlasmaBoss },
  { key: "postGameBosses", label: "Other bosses", test: isPostGameBoss },
];

export function Trainers() {
  const state = useData<TrainerLocation[]>(() => import("../data/trainers.generated.json"));
  const pokemonState = useData<PokemonEntry[]>(() => import("../data/pokemon.generated.json"));
  const trainerPortraits = useData<Record<string, string>>(() => import("../data/trainer-portraits.generated.json"));
  const trainerClassIcons = useData<Record<string, string>>(() => import("../data/trainer-class-icons.generated.json"));
  const [query, setQuery] = useState(useInitialQuery());
  const [activeCategories, setActiveCategories] = useState<Set<CategoryKey>>(new Set());

  const toggleCategory = (key: CategoryKey) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const pokemonByName = useMemo(() => {
    if (pokemonState.status !== "ready") return new Map<string, PokemonEntry>();
    return new Map(pokemonState.data.map((p) => [p.name.toLowerCase(), p]));
  }, [pokemonState]);

  const activeTests = CATEGORIES.filter((c) => activeCategories.has(c.key)).map((c) => c.test);
  const passesCategoryFilter = (battle: TrainerBattle) => activeTests.length === 0 || activeTests.some((test) => test(battle));

  const filtered = useMemo(() => {
    if (state.status !== "ready") return [];
    return state.data
      .map((loc) => ({ ...loc, battles: loc.battles.filter(passesCategoryFilter) }))
      .filter((loc) => loc.battles.length > 0)
      .filter(
        (loc) =>
          !query.trim() ||
          matches(loc.location, query) ||
          loc.battles.some((b) => matches(b.trainerName, query) || b.pokemon.some((p) => matches(p.species, query))),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, query, activeCategories]);

  const hasQuery = query.trim().length > 0;
  const hasCategoryFilter = activeCategories.size > 0;

  return (
    <main className="page">
      <PageHeader eyebrow="DEPARTURE" title="TRAINERS" subtitle="Every trainer battle by location — gym leaders, rivals, the Elite Four and post-game rematches." />

      <SearchBox value={query} onInput={setQuery} placeholder="Search a trainer, class or a Pokémon…" resultCount={state.status === "ready" ? filtered.length : undefined} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 12 }}>
        {CATEGORIES.map((c) => (
          <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-dim)" }}>
            <input type="checkbox" checked={activeCategories.has(c.key)} onChange={() => toggleCategory(c.key)} />
            {c.label}
          </label>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        {state.status === "error" && <DataError label="trainer rosters" />}
        {state.status === "loading" && <EmptyState>Loading trainers…</EmptyState>}
        {state.status === "ready" && filtered.length === 0 && <EmptyState>No trainer, class or Pokémon matches “{query}”.</EmptyState>}
        {state.status === "ready" &&
          filtered.map((loc) => (
            <details key={loc.location} className={encStyles.location} open={hasQuery || hasCategoryFilter}>
              <summary className={encStyles.summary}>
                <span>
                  <span className={encStyles.locName}>{loc.location}</span>{" "}
                  <span className={encStyles.locMeta}>· {loc.battles.length} battles</span>
                </span>
                <svg className={encStyles.chevron} width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l6 5-6 5" stroke="currentColor" stroke-width="1.6" fill="none" />
                </svg>
              </summary>
              <div className={encStyles.body}>
                {loc.battles.map((battle, i) => (
                  <div className={styles.battle} key={i}>
                    <div className={styles.battleHead}>
                      {isImportant(battle)
                        ? trainerPortraits.status === "ready" &&
                          trainerPortraits.data[portraitKey(battle)] && (
                            <img src={trainerPortraits.data[portraitKey(battle)]} alt="" className={styles.leaderPortrait} loading="lazy" referrerPolicy="no-referrer" onError={hideOnError} />
                          )
                        : trainerClassIcons.status === "ready" &&
                          resolveClassIcon(battle.trainerName, trainerClassIcons.data) && (
                            <img src={resolveClassIcon(battle.trainerName, trainerClassIcons.data)} alt="" className={styles.classIcon} loading="lazy" referrerPolicy="no-referrer" onError={hideOnError} />
                          )}
                      {isGymLeader(battle) && <span className={styles.leaderBadge}>GYM LEADER</span>}
                      {isRival(battle) && <span className={styles.leaderBadge}>RIVAL</span>}
                      {isEliteFour(battle) && <span className={styles.leaderBadge}>ELITE FOUR</span>}
                      {isChampion(battle) && <span className={styles.leaderBadge}>CHAMPION</span>}
                      {isPlasmaBoss(battle) && <span className={styles.leaderBadge}>TEAM PLASMA</span>}
                      {isPostGameBoss(battle) && <span className={styles.leaderBadge}>BOSS</span>}
                      <span className={styles.trainerName}>{battle.trainerName}</span>
                      {battle.battleFormat && <span className="tag tag--teal">{battle.battleFormat}</span>}
                      {battle.condition && <span className="tag tag--amber">{battle.condition}</span>}
                      {battle.subArea && <span className="tag">{battle.subArea}</span>}
                      {battle.locationNote && <span className="tag">Found at {battle.locationNote}</span>}
                      {battle.rewardNote && <span className="tag tag--teal">{battle.rewardNote}</span>}
                    </div>
                    {battle.notes.length > 0 && <p className={styles.battleNotes}>{battle.notes.join(" · ")}</p>}
                    <div className={encStyles.cardGrid}>
                      {battle.pokemon.map((mon, j) => {
                        const altNames = mon.species.split("/");
                        if (altNames.length === 1) {
                          const species = pokemonByName.get(baseSpeciesName(mon.species).toLowerCase());
                          return (
                            <Link
                              key={j}
                              href={species ? `/pokedex/${encodeURIComponent(species.name.toLowerCase())}` : "#"}
                              className={encStyles.speciesCard}
                            >
                              {species && <img src={spriteUrl(species.dexNumber)} alt="" className={encStyles.cardSprite} />}
                              <div className={encStyles.cardInfo}>
                                <span className={encStyles.cardName}>{mon.species}</span>
                                <span className={encStyles.cardMeta}>
                                  {mon.level ? `Lv.${mon.level}` : "—"}
                                  {mon.heldItem ? ` · @${mon.heldItem}` : ""}
                                </span>
                                {mon.note && <span className={encStyles.flagNote}>{mon.note}</span>}
                              </div>
                            </Link>
                          );
                        }

                        // Starter-dependent (or similar) rows list several alternatives ("Snivy/Tepig/Oshawott") —
                        // show each as its own small linked sprite instead of unlinked plain text.
                        const altSpecies = altNames.map((n) => pokemonByName.get(baseSpeciesName(n).toLowerCase()));
                        return (
                          <div key={j} className={`${encStyles.speciesCard} ${styles.altCard}`}>
                            <div className={styles.altSpeciesRow}>
                              {altSpecies.map((s, k) =>
                                s ? (
                                  <Link key={k} href={`/pokedex/${encodeURIComponent(s.name.toLowerCase())}`} title={altNames[k]}>
                                    <img src={spriteUrl(s.dexNumber)} alt={altNames[k]} className={styles.altSprite} />
                                  </Link>
                                ) : (
                                  <span key={k} className={styles.altSprite} />
                                ),
                              )}
                            </div>
                            <div className={encStyles.cardInfo}>
                              <span className={encStyles.cardName}>{mon.species}</span>
                              <span className={encStyles.cardMeta}>
                                {mon.level ? `Lv.${mon.level}` : "—"}
                                {mon.heldItem ? ` · @${mon.heldItem}` : ""}
                              </span>
                              {mon.note && <span className={encStyles.flagNote}>{mon.note}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ))}
      </div>
    </main>
  );
}
