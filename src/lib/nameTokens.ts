import { Path, Shape, Vector2 } from "three";

export const SVG_TOKEN = "{svg}";
export const SVG_TOKEN_RE = /\{svg\}/gi;

export type NameSegment =
  | { kind: "text"; text: string }
  | { kind: "svg" };

export type ClickerToken =
  | { kind: "letter"; ch: string }
  | { kind: "svg" };

export function hasSvgToken(value: string) {
  SVG_TOKEN_RE.lastIndex = 0;
  return SVG_TOKEN_RE.test(value);
}

/** Split a formatted name into text / {svg} segments (keeps surrounding spaces in text). */
export function splitNameSegments(value: string): NameSegment[] {
  const parts = value.split(/(\{svg\})/gi);
  const out: NameSegment[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (/^\{svg\}$/i.test(part)) out.push({ kind: "svg" });
    else out.push({ kind: "text", text: part });
  }
  return out;
}

/** One clicker well/cap per letter, plus one slot per {svg}. Spaces are skipped. */
export function clickerTokens(name: string): ClickerToken[] {
  const out: ClickerToken[] = [];
  for (const seg of splitNameSegments(name)) {
    if (seg.kind === "svg") {
      out.push({ kind: "svg" });
      continue;
    }
    for (const ch of seg.text) {
      if (ch.trim()) out.push({ kind: "letter", ch });
    }
  }
  return out;
}

/** Apply text case without mangling {svg} placeholders. */
export function formatNamePreservingSvg(
  value: string,
  mode: "as-is" | "upper" | "lower" | "title",
  formatText: (text: string, mode: "as-is" | "upper" | "lower" | "title") => string,
) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return formatText("", mode);
  if (!hasSvgToken(trimmed)) return formatText(trimmed, mode);

  return splitNameSegments(trimmed)
    .map((seg) => {
      if (seg.kind === "svg") return SVG_TOKEN;
      // Keep edge spaces so "Michael {svg} Corpuz" stays readable after case changes.
      const lead = seg.text.match(/^\s*/)?.[0] ?? "";
      const trail = seg.text.match(/\s*$/)?.[0] ?? "";
      const core = seg.text.trim();
      if (!core) return seg.text;
      return `${lead}${formatText(core, mode)}${trail}`;
    })
    .join("");
}

/** Rebuild a shape with mapped vertices (curves become polylines — fine for print). */
export function mapShape(shape: Shape, map: (x: number, y: number) => Vector2, samples = 72): Shape {
  const out = new Shape();
  const pts = shape.getPoints(samples).map((p) => map(p.x, p.y));
  if (pts.length < 3) return shape;
  out.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) out.lineTo(pts[i].x, pts[i].y);
  out.closePath();

  for (const hole of shape.holes) {
    const holePts = hole.getPoints(Math.max(24, Math.floor(samples * 0.66))).map((p) => map(p.x, p.y));
    if (holePts.length < 3) continue;
    const h = new Path();
    h.moveTo(holePts[0].x, holePts[0].y);
    for (let i = 1; i < holePts.length; i++) h.lineTo(holePts[i].x, holePts[i].y);
    h.closePath();
    out.holes.push(h);
  }
  return out;
}

export function translateShape(shape: Shape, dx: number, dy: number, samples = 72) {
  return mapShape(shape, (x, y) => new Vector2(x + dx, y + dy), samples);
}

/** Scale about (cx, cy), then place the scaled bounds center at (tx, ty). */
export function placeShape(
  shape: Shape,
  scale: number,
  cx: number,
  cy: number,
  tx: number,
  ty: number,
  samples = 72,
) {
  return mapShape(
    shape,
    (x, y) => new Vector2((x - cx) * scale + tx, (y - cy) * scale + ty),
    samples,
  );
}
