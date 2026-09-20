export type DamageClass = "physical" | "special" | "status";

const LABELS: Record<DamageClass, string> = {
  physical: "Physical",
  special: "Special",
  status: "Status",
};

/** Small self-drawn glyph per damage category — filled circle (physical), four-pointed star (special), ring (status). No icon library; matches the site's typographic/self-drawn visual language. */
export function DamageClassIcon({ damageClass, size = 14 }: { damageClass: DamageClass; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      {damageClass === "physical" && <circle cx="8" cy="8" r="6" fill="currentColor" />}
      {damageClass === "special" && <path d="M8 0 L10 6 L16 8 L10 10 L8 16 L6 10 L0 8 L6 6 Z" fill="currentColor" />}
      {damageClass === "status" && <circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="2" />}
    </svg>
  );
}

export function DamageClassLabel({ damageClass }: { damageClass: DamageClass }) {
  return <>{LABELS[damageClass] ?? damageClass}</>;
}
