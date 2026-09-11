import { parse } from "opentype.js";
import type { Font } from "opentype.js";
import { getFont } from "./fonts";
import { formatNamePreservingSvg } from "./nameTokens";

const cache = new Map<string, Promise<Font>>();

export async function loadFont(fontId: string): Promise<Font> {
  const existing = cache.get(fontId);
  if (existing) return existing;

  const meta = getFont(fontId);
  const promise = (async () => {
    const res = await fetch(meta.url);
    if (!res.ok) {
      throw new Error(`Could not load font ${meta.name} (${res.status})`);
    }
    const buffer = await res.arrayBuffer();
    return parse(buffer);
  })();

  cache.set(fontId, promise);
  try {
    return await promise;
  } catch (err) {
    cache.delete(fontId);
    throw err;
  }
}

function formatTextChunk(value: string, mode: "as-is" | "upper" | "lower" | "title") {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return "NAME";
  switch (mode) {
    case "upper":
      return trimmed.toUpperCase();
    case "lower":
      return trimmed.toLowerCase();
    case "title":
      return trimmed
        .toLowerCase()
        .replace(/\b([a-z])/g, (m) => m.toUpperCase());
    default:
      return trimmed;
  }
}

export function formatName(value: string, mode: "as-is" | "upper" | "lower" | "title") {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return "NAME";
  return formatNamePreservingSvg(trimmed, mode, (text, textMode) => {
    if (!text.replace(/\s+/g, " ").trim()) return text;
    return formatTextChunk(text, textMode);
  });
}
