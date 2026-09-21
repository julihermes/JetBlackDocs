import styles from "./SearchBox.module.css";

export function SearchBox({
  value,
  onInput,
  placeholder,
  resultCount,
}: {
  value: string;
  onInput: (v: string) => void;
  placeholder: string;
  resultCount?: number;
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.field}>
        <svg className={styles.icon} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.6" />
          <path d="M11 11L14.5 14.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <input
          className={styles.input}
          type="search"
          value={value}
          placeholder={placeholder}
          onInput={(e) => onInput((e.target as HTMLInputElement).value)}
          aria-label={placeholder}
        />
      </div>
      {resultCount !== undefined && (
        <p className={styles.count}>
          {resultCount} {resultCount === 1 ? "result" : "results"}
        </p>
      )}
    </div>
  );
}
