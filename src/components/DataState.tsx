import type { ComponentChildren } from "preact";

export function DataError({ label }: { label: string }) {
  return <p className="empty-state">Couldn't load {label}. Try refreshing the page.</p>;
}

export function EmptyState({ children }: { children: ComponentChildren }) {
  return <p className="empty-state">{children}</p>;
}
