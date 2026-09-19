import { useEffect, useState } from "preact/hooks";

type State<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "error"; error: unknown };

/** Loads a data module lazily (code-split by Vite) so a page's JSON only downloads when visited. */
export function useData<T>(loader: () => Promise<{ default: T }>): State<T> {
  const [state, setState] = useState<State<T>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    loader()
      .then((mod) => {
        if (!cancelled) setState({ status: "ready", data: mod.default });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", error });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
