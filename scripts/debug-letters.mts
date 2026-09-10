import { parse } from "opentype.js";
import type { BufferGeometry } from "three";
import { DEFAULT_PARAMS } from "../src/types.ts";
import { buildKeychain } from "../src/lib/geometry.ts";

function openEdges(geometry: BufferGeometry) {
  const pos = geometry.getAttribute("position");
  const idx = geometry.getIndex();
  const tris = idx ? idx.count / 3 : (pos?.count ?? 0) / 3;
  const edges = new Map<string, number>();
  const key = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  for (let t = 0; t < tris; t++) {
    const i0 = idx ? idx.getX(t * 3) : t * 3;
    const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    for (const [a, b] of [
      [i0, i1],
      [i1, i2],
      [i2, i0],
    ]) {
      const k = key(a, b);
      edges.set(k, (edges.get(k) ?? 0) + 1);
    }
  }
  let open = 0;
  for (const c of edges.values()) if (c === 1) open += 1;
  return { verts: pos?.count ?? 0, tris, open };
}

function vertsOnCircle(geometry: BufferGeometry, x: number, y: number, r: number) {
  const pos = geometry.getAttribute("position");
  if (!pos) return 0;
  let n = 0;
  for (let i = 0; i < pos.count; i++) {
    const d = Math.hypot(pos.getX(i) - x, pos.getY(i) - y);
    if (Math.abs(d - r) < 0.2) n += 1;
  }
  return n;
}

const font = parse(
  await (
    await fetch(
      "https://cdn.jsdelivr.net/npm/@fontsource/montserrat@5.2.6/files/montserrat-latin-700-normal.woff",
    )
  ).arrayBuffer(),
);

const built = buildKeychain(font, { ...DEFAULT_PARAMS, name: "MICHAEL", shape: "pill" });
for (const part of built.parts) {
  const extra =
    part.id === "outer" || part.id === "outline"
      ? { holeVerts: vertsOnCircle(part.geometry, -built.metrics.widthMm / 2 + 2.5 + 2.8, 0, 2.5) }
      : {};
  console.log(part.id, openEdges(part.geometry), extra);
}
const names = built.parts.filter((p) => p.id === "name");
console.log("letters", names.length, "A tris", names[4] ? openEdges(names[4].geometry) : null);
