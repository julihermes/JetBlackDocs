export function isBlank(line: string): boolean {
  return line.trim().length === 0;
}

export function isDashLine(line: string): boolean {
  return /^-{2,}\s*$/.test(line.trim());
}

export interface BoxedHeader {
  title: string;
  headerLine: number; // 1-indexed line of the title itself
  bodyStart: number; // 1-indexed line where the section body begins
}

/** Finds every `----\nTitle\n----` boxed header in a slice of lines (0-indexed array, 1-indexed output). */
export function findBoxedHeaders(lines: string[]): BoxedHeader[] {
  const found: BoxedHeader[] = [];
  for (let i = 1; i < lines.length - 1; i++) {
    if (isDashLine(lines[i - 1]) && !isBlank(lines[i]) && !isDashLine(lines[i]) && isDashLine(lines[i + 1])) {
      found.push({ title: lines[i].trim(), headerLine: i + 1, bodyStart: i + 2 });
    }
  }
  return found;
}

export interface Block {
  headerText: string;
  headerLineNumber: number; // 1-indexed
  contentLines: Array<{ n: number; text: string }>;
}

/**
 * Splits a source into blocks anchored on lines matching `headerPattern`.
 * Everything between one header match and the next (or EOF) becomes that
 * block's content. Pure decoration (dashed rules, blank lines) is left in
 * content for the caller to skip — callers usually only care about the
 * first few meaningful lines anyway.
 */
export function splitIntoBlocks(lines: string[], headerPattern: RegExp): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;

  lines.forEach((text, i) => {
    const n = i + 1;
    const match = headerPattern.exec(text);
    if (match) {
      if (current) blocks.push(current);
      current = { headerText: text.trim(), headerLineNumber: n, contentLines: [] };
    } else if (current) {
      current.contentLines.push({ n, text });
    }
  });
  if (current) blocks.push((current as Block));
  return blocks;
}

/** Returns the non-blank, non-dash-rule lines of a block, in order. */
export function meaningfulLines(block: Block): Array<{ n: number; text: string }> {
  return block.contentLines.filter((l) => !isBlank(l.text) && !isDashLine(l.text));
}

/**
 * Splits a block's content into paragraphs (groups of consecutive non-blank
 * lines), dropping decorative dash rules.
 */
export function paragraphs(block: Block): Array<Array<{ n: number; text: string }>> {
  const groups: Array<Array<{ n: number; text: string }>> = [];
  let current: Array<{ n: number; text: string }> = [];
  for (const line of block.contentLines) {
    if (isBlank(line.text) || isDashLine(line.text)) {
      if (current.length) groups.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) groups.push(current);
  return groups;
}
