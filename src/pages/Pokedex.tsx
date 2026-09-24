import { useMemo, useState } from "preact/hooks";
import { PageHeader } from "../components/PageHeader";
import { SearchBox } from "../components/SearchBox";
import { PokemonCard } from "../components/PokemonCard";
import { DataError, EmptyState } from "../components/DataState";
import { useData } from "../lib/useData";
import { matches } from "../lib/filter";
import type { PokemonEntry } from "../lib/types";

export function Pokedex() {
  const state = useData<PokemonEntry[]>(() => import("../data/pokemon.generated.json"));
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (state.status !== "ready") return [];
    let list = [...state.data].sort((a, b) => a.dexNumber - b.dexNumber);
    if (!query.trim()) return list;
    return list.filter((p) => matches(p.name, query) || p.abilities.some((a) => matches(a, query)));
  }, [state, query]);

  return (
    <main className="page">
      <PageHeader title="POKÉDEX" subtitle="Every species available in JetBlack — base stats, abilities, and full level-up learnsets, with vanilla changes called out." />

      <SearchBox value={query} onInput={setQuery} placeholder="Search by name or ability…" resultCount={state.status === "ready" ? filtered.length : undefined} />

      <div style={{ marginTop: 16 }}>
        {state.status === "error" && <DataError label="the Pokédex" />}
        {state.status === "loading" && <EmptyState>Loading species…</EmptyState>}
        {state.status === "ready" && filtered.length === 0 && <EmptyState>No Pokémon match “{query}”.</EmptyState>}
        {state.status === "ready" && filtered.map((p) => <PokemonCard key={p.dexNumber + p.name} pokemon={p} />)}
      </div>
    </main>
  );
}
