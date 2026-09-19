import { Link } from "wouter-preact";
import { PageHeader } from "../components/PageHeader";

export function NotFound() {
  return (
    <main className="page">
      <PageHeader eyebrow="GATE CLOSED · 404" title="CANCELLED" subtitle="This page doesn't exist — the gate's been reassigned." />
      <p style={{ marginTop: 16 }}>
        <Link href="/" style={{ color: "var(--teal)" }}>
          ← Back to departures
        </Link>
      </p>
    </main>
  );
}
