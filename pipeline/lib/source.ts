import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface SourceFile {
  filename: string;
  path: string;
  raw: string;
  lines: string[];
}

const SOURCE_DIR = join(process.cwd(), "data-source");

export function loadSourceFiles(): SourceFile[] {
  const filenames = readdirSync(SOURCE_DIR).filter((f) => f.toLowerCase().endsWith(".txt"));
  return filenames.map((filename) => {
    const path = join(SOURCE_DIR, filename);
    const raw = readFileSync(path, "utf-8").replace(/\r\n/g, "\n");
    return { filename, path, raw, lines: raw.split("\n") };
  });
}

/**
 * Finds the source file matching a content signature rather than a filename,
 * so renaming the .txt between hack versions doesn't break the pipeline.
 */
export function findBySignature(
  files: SourceFile[],
  label: string,
  signature: RegExp,
): SourceFile {
  const matches = files.filter((f) => signature.test(f.raw));
  if (matches.length === 0) {
    throw new Error(
      `Couldn't find any file in data-source/ matching the "${label}" signature (pattern: ${signature}). ` +
        `Files available: ${files.map((f) => f.filename).join(", ")}`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `More than one file in data-source/ matches the "${label}" signature: ` +
        `${matches.map((f) => f.filename).join(", ")}. Rename or remove the duplicate.`,
    );
  }
  return matches[0];
}

/** Strips trailing whitespace and collapses blank-line runs, keeping line numbers stable (1-indexed). */
export function numbered(lines: string[]): Array<{ n: number; text: string }> {
  return lines.map((text, i) => ({ n: i + 1, text }));
}
