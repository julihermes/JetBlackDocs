import { useState } from "preact/hooks";
import { Link, useLocation } from "wouter-preact";
import { MORE_ROUTES, PRIMARY_ROUTES, ROUTES } from "../routes";
import styles from "./Nav.module.css";

export function Nav() {
  const [location] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = MORE_ROUTES.some((r) => r.path === location);

  return (
    <>
      <nav className={styles.topBar} aria-label="Main sections">
        <div className={styles.topBrand}>
          JET<span>BLACK</span>
        </div>
        {ROUTES.map((r) => (
          <Link
            key={r.path}
            href={r.path}
            className={`${styles.topLink} ${location === r.path ? styles.topLinkActive : ""}`}
          >
            <span className={styles.topCode}>{r.code}</span>
            {r.label}
          </Link>
        ))}
      </nav>

      <nav className={styles.bottomBar} aria-label="Main sections">
        {PRIMARY_ROUTES.map((r) => (
          <Link
            key={r.path}
            href={r.path}
            className={`${styles.bottomLink} ${location === r.path ? styles.bottomLinkActive : ""}`}
            onClick={() => setMoreOpen(false)}
          >
            <span className={styles.bottomCode}>{r.code}</span>
            <span className={styles.bottomLabel}>{r.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className={`${styles.bottomLink} ${isMoreActive ? styles.bottomLinkActive : ""}`}
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
        >
          <span className={styles.bottomCode}>•••</span>
          <span className={styles.bottomLabel}>More</span>
        </button>
      </nav>

      {moreOpen && (
        <>
          <div className={styles.sheetBackdrop} onClick={() => setMoreOpen(false)} />
          <div className={styles.sheet}>
            <div className={styles.sheetGrid}>
              {MORE_ROUTES.map((r) => (
                <Link key={r.path} href={r.path} className={styles.sheetItem} onClick={() => setMoreOpen(false)}>
                  <span className={styles.sheetCode}>{r.code}</span>
                  <span className={styles.sheetLabel}>{r.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
