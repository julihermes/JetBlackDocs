export class ParseError extends Error {
  constructor(source: string, lineNumber: number, lineText: string, reason: string) {
    super(
      `[${source}] line ${lineNumber}: ${reason}\n  > ${lineText.trim()}`,
    );
    this.name = "ParseError";
  }
}

export function assertParse(
  condition: unknown,
  source: string,
  lineNumber: number,
  lineText: string,
  reason: string,
): asserts condition {
  if (!condition) {
    throw new ParseError(source, lineNumber, lineText, reason);
  }
}
