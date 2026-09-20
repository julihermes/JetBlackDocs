import { useSearch } from "wouter-preact";

/** Reads `?q=...` once, so a cross-link like /encounters?q=Route+5 lands pre-filtered. */
export function useInitialQuery(): string {
  const search = useSearch();
  return new URLSearchParams(search).get("q") ?? "";
}
