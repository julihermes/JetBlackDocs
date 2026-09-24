import { IS_GEN5_TYPE } from "./types5";

/** Low-alpha tint of a move/species type, for backgrounds — falls back to the plain surface color for an unrecognized type. */
export function typeBg(type: string): string {
  const key = type.trim().toLowerCase();
  if (!IS_GEN5_TYPE.has(key)) return "var(--surface)";
  return `color-mix(in srgb, var(--type-${key}) 16%, var(--surface))`;
}
