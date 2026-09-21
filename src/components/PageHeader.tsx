import type { ComponentChildren } from "preact";
import { SplitFlap } from "./SplitFlap";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ComponentChildren;
}) {
  return (
    <header>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <SplitFlap text={title} />
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
      {children}
    </header>
  );
}
