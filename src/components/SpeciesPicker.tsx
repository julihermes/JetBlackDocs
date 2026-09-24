import { useMemo, useRef, useState } from "preact/hooks";
import { matches } from "../lib/filter";
import { spriteUrl } from "../lib/sprites";
import type { PokemonEntry } from "../lib/types";
import styles from "./SpeciesPicker.module.css";

const MAX_RESULTS = 8;

/**
 * Type-to-filter species picker. Deliberately not a native <datalist>: that
 * can't be styled to match the dark theme and renders differently in every
 * browser, and on this page the picker is the first thing anyone touches.
 *
 * The selection itself lives in the URL — this holds only the query text.
 */
export function SpeciesPicker({
  all,
  selected,
  onSelect,
  placeholder,
}: {
  all: PokemonEntry[];
  selected?: PokemonEntry;
  onSelect: (p: PokemonEntry) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<number | undefined>(undefined);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return all.filter((p) => matches(p.name, query)).slice(0, MAX_RESULTS);
  }, [all, query]);

  const choose = (p: PokemonEntry) => {
    onSelect(p);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[active] ?? results[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <input
        className={styles.input}
        type="search"
        value={query}
        placeholder={selected ? `${selected.name} — change…` : placeholder}
        aria-label={placeholder}
        onInput={(e) => {
          setQuery((e.target as HTMLInputElement).value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // A click on a result fires blur first, so closing has to wait for it.
        onBlur={() => (blurTimer.current = window.setTimeout(() => setOpen(false), 120))}
        onKeyDown={onKeyDown}
      />
      {open && query.trim() !== "" && (
        <div className={styles.results}>
          {results.length === 0 && <p className={styles.empty}>No species matches “{query}”.</p>}
          {results.map((p, i) => (
            <button
              key={p.name}
              type="button"
              className={`${styles.result} ${i === active ? styles.resultActive : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                window.clearTimeout(blurTimer.current);
                choose(p);
              }}
            >
              <img src={spriteUrl(p.dexNumber)} alt="" className={styles.resultSprite} loading="lazy" />
              <span>{p.name}</span>
              <span className={styles.resultDex}>#{String(p.dexNumber).padStart(3, "0")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
