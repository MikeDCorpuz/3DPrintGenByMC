import { parse } from "opentype.js";
import { Vector2 } from "three";
import { DEFAULT_PARAMS } from "../src/types.ts";
import { buildKeychain } from "../src/lib/geometry.ts";
import { letterShapesMm, textShapes, shapesBounds } from "../src/lib/letters.ts";
import { signedArea } from "../src/lib/offset.ts";

function minStroke(outer: { x: number; y: number }[], hole: { x: number; y: number }[]) {
  let min = Infinity;
  for (const p of hole) {
    for (let i = 0, j = outer.length - 1; i < outer.length; j = i++) {
      const a = outer[j];
      const b = outer[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      const t = len2 < 1e-12 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
      min = Math.min(min, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
    }
  }
  return min;
}

const font = parse(
  await (
    await fetch(
      "https://cdn.jsdelivr.net/npm/@fontsource/montserrat@5.2.6/files/montserrat-latin-700-normal.woff",
    )
  ).arrayBuffer(),
);

const built = buildKeychain(font, {
  ...DEFAULT_PARAMS,
  name: "Jesse",
  keychainType: "cloud",
  textCase: "as-is",
});

const names = built.parts.filter((p) => p.id === "name");
console.log(
  "parts",
  names.map((p) => p.name),
);
names.forEach((p) => {
  p.geometry.computeBoundingBox();
  const bb = p.geometry.boundingBox!;
  console.log(p.name, `z ${bb.min.z.toFixed(2)}..${bb.max.z.toFixed(2)}`);
});

const samples = 16;
const raw = textShapes(font, "Jesse", 100, 0, samples);
const box = shapesBounds(raw);
const scale = 52 / box.width;
const mm = letterShapesMm(raw, scale, (box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2, samples);
mm.forEach((sh, i) => {
  const outer = sh.getPoints(48).map((p) => new Vector2(p.x, p.y));
  if (outer.length > 2 && outer[0].distanceToSquared(outer[outer.length - 1]) < 1e-8) outer.pop();
  const holes = sh.holes.map((h) => {
    const pts = h.getPoints(48).map((p) => new Vector2(p.x, p.y));
    if (pts.length > 2 && pts[0].distanceToSquared(pts[pts.length - 1]) < 1e-8) pts.pop();
    return pts;
  });
  const xs = holes[0]?.map((p) => p.x) ?? [];
  const ys = holes[0]?.map((p) => p.y) ?? [];
  console.log(i, {
    holes: holes.length,
    area: +signedArea(outer).toFixed(2),
    stroke: holes[0] ? +minStroke(outer, holes[0]).toFixed(3) : null,
    hole: holes[0]
      ? {
          w: +(Math.max(...xs) - Math.min(...xs)).toFixed(2),
          h: +(Math.max(...ys) - Math.min(...ys)).toFixed(2),
        }
      : null,
  });
});
