import { Link } from "wouter-preact";
import type { PokemonEntry } from "../lib/types";
import { spriteUrl } from "../lib/sprites";
import { TypeBadge } from "./TypeBadge";
import styles from "./PokemonCard.module.css";

function bst(s: PokemonEntry["stats"]): number {
  return s.hp + s.atk + s.def + s.spa + s.spd + s.spe;
}

export function PokemonCard({ pokemon }: { pokemon: PokemonEntry }) {
  const total = bst(pokemon.stats);
  const delta = pokemon.vanillaStats ? total - bst(pokemon.vanillaStats) : 0;

  return (
    <Link href={`/pokedex/${encodeURIComponent(pokemon.name.toLowerCase())}`} className={`${styles.pass} ${!pokemon.obtainable ? styles.passDim : ""}`}>
      <img className={styles.sprite} src={spriteUrl(pokemon.dexNumber)} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />
      <div className={styles.main}>
        <div className={styles.topRow}>
          <span className={styles.dexNo}>#{String(pokemon.dexNumber).padStart(3, "0")}</span>
          <span className={styles.name}>{pokemon.name}</span>
        </div>
        <div className={styles.typeRow}>
          {pokemon.types.map((t) => (
            <TypeBadge type={t} key={t} />
          ))}
          {!pokemon.obtainable && <span className="tag">not confirmed obtainable</span>}
        </div>
        <span className={styles.abilities}>{pokemon.abilities.join(" / ")}</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.stub}>
        <span className={styles.bst}>{total}</span>
        <span className={styles.bstLabel}>BST</span>
        {delta !== 0 && <span className={`${styles.delta} ${delta > 0 ? styles.deltaUp : ""}`}>{delta > 0 ? "+" : ""}{delta}</span>}
      </div>
    </Link>
  );
}
