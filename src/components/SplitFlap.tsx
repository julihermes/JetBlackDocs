import { useEffect, useRef, useState } from "preact/hooks";

const FLAP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ";
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * The site's signature moment: a section title that flips through characters
 * like a mechanical airport departure board before settling on its final text.
 * Runs once on mount; respects prefers-reduced-motion.
 */
export function SplitFlap({ text, as: Tag = "h1" }: { text: string; as?: "h1" | "h2" }) {
  const [display, setDisplay] = useState(() => (prefersReducedMotion() ? text : " ".repeat(text.length)));
  const doneRef = useRef(prefersReducedMotion());

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const chars = text.split("");
    const settleAt = chars.map((_, i) => 220 + i * 55 + Math.random() * 80);
    const maxSettle = Math.max(...settleAt, 0);
    let raf: number;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      setDisplay(
        chars
          .map((c, i) => {
            if (c === " ") return " ";
            if (elapsed >= settleAt[i]) return c;
            return FLAP_CHARS[Math.floor((elapsed / 40 + i * 3) % FLAP_CHARS.length)];
          })
          .join(""),
      );
      if (elapsed < maxSettle) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text]);

  return <Tag className="page-title split-flap">{display}</Tag>;
}
