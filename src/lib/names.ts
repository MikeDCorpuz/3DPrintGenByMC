import { formatName } from "./fontCache";
import type { TextCase } from "../types";

export const MAX_NAMES = 48;

export function parseNames(raw: string, textCase: TextCase): string[] {
  const names: string[] = [];
  for (const part of raw.split(",")) {
    if (!part.trim()) continue;
    names.push(formatName(part, textCase));
    if (names.length >= MAX_NAMES) break;
  }
  return names.length ? names : ["NAME"];
}
