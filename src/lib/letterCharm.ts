import { Box3, Vector2, Vector3, type BufferGeometry } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Font } from "opentype.js";
import type { BuiltKeychain, BuiltPart, KeychainParams } from "../types";
import { formatName } from "./fontCache";
import { letterShapesMm, shapesBounds, textShapes } from "./letters";
import { extrudeSolid } from "./extrude";
import { resolveMonogramLetter } from "./monogram";
import {
  circlePoly,
  differencePolys,
  intersectionPolys,
  offsetPolys,
  polyBounds,
  polysToShapes,
  shapeToPolys,
  type Poly,
} from "./offset";

const PLA = 1.24;

function prepare(geometry: BufferGeometry) {
  const welded = mergeVertices(geometry, 1e-4);
  if (welded !== geometry) geometry.dispose();
  welded.computeVertexNormals();
  welded.computeBoundingBox();
  return welded;
}

function volumeOf(geometry: BufferGeometry) {
  const pos = geometry.getAttribute("position");
  const idx = geometry.getIndex();
  if (!pos) return 0;
  let volume = 0;
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const triCount = idx ? idx.count / 3 : pos.count / 3;
  for (let i = 0; i < triCount; i++) {
    const i0 = idx ? idx.getX(i * 3) : i * 3;
    const i1 = idx ? idx.getX(i * 3 + 1) : i * 3 + 1;
    const i2 = idx ? idx.getX(i * 3 + 2) : i * 3 + 2;
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    volume += a.dot(b.cross(c));
  }
  return Math.abs(volume) / 6;
}

function rotatePoly(poly: Poly, angle: number): Poly {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return poly.map((p) => new Vector2(p.x * c - p.y * s, p.x * s + p.y * c));
}

function translatePoly(poly: Poly, dx: number, dy: number): Poly {
  return poly.map((p) => new Vector2(p.x + dx, p.y + dy));
}

type Stroke = {
  /** 0 = text runs left-to-right, PI/2 = text runs bottom-to-top. */
  angle: number;
  cx: number;
  cy: number;
  along: number;
  across: number;
};

function pointInPolys(x: number, y: number, polys: Poly[]) {
  let inside = false;
  for (const poly of polys) {
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const yi = poly[i].y;
      const yj = poly[j].y;
      if ((yi > y) === (yj > y)) continue;
      const xi = poly[i].x;
      const xj = poly[j].x;
      const xHit = ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (x < xHit) inside = !inside;
    }
  }
  return inside;
}

/** Chamfer distance (mm) from each inside cell to the letter edge. */
function distanceField(inside: Uint8Array, cols: number, rows: number, cell: number) {
  const inf = 1e6;
  const dist = new Float32Array(inside.length);
  for (let i = 0; i < inside.length; i++) dist[i] = inside[i] ? inf : 0;
  const relax = (i: number, j: number, w: number) => {
    const next = dist[j] + w;
    if (next < dist[i]) dist[i] = next;
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (c > 0) relax(i, i - 1, 1);
      if (r > 0) relax(i, i - cols, 1);
      if (c > 0 && r > 0) relax(i, i - cols - 1, 1.4142);
      if (c + 1 < cols && r > 0) relax(i, i - cols + 1, 1.4142);
    }
  }
  for (let r = rows - 1; r >= 0; r--) {
    for (let c = cols - 1; c >= 0; c--) {
      const i = r * cols + c;
      if (c + 1 < cols) relax(i, i + 1, 1);
      if (r + 1 < rows) relax(i, i + cols, 1);
      if (c + 1 < cols && r + 1 < rows) relax(i, i + cols + 1, 1.4142);
      if (c > 0 && r + 1 < rows) relax(i, i + cols - 1, 1.4142);
    }
  }
  for (let i = 0; i < dist.length; i++) dist[i] *= cell;
  return dist;
}

/**
 * Longest thick stroke of the letter — a stem or bar, not the centroid.
 * An M's valley is the middle of the silhouette, but the legs are the long part.
 */
function longestStroke(polys: Poly[], hole: { x: number; y: number; r: number }): Stroke {
  const bounds = polyBounds(polys);
  const span = Math.max(bounds.width, bounds.height, 1);
  const cell = Math.min(0.7, Math.max(0.4, span / 130));
  const pad = cell;
  const minX = bounds.minX - pad;
  const minY = bounds.minY - pad;
  const cols = Math.max(3, Math.ceil((bounds.width + pad * 2) / cell));
  const rows = Math.max(3, Math.ceil((bounds.height + pad * 2) / cell));
  const inside = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    const y = minY + (r + 0.5) * cell;
    for (let c = 0; c < cols; c++) {
      const x = minX + (c + 0.5) * cell;
      if (pointInPolys(x, y, polys)) inside[r * cols + c] = 1;
    }
  }
  const dist = distanceField(inside, cols, rows, cell);
  const holeR2 = (hole.r + 1.8) ** 2;
  const blocked = (x: number, y: number) => {
    const dx = x - hole.x;
    const dy = y - hole.y;
    return dx * dx + dy * dy <= holeR2;
  };

  const consider = (best: Stroke | null, next: Stroke) => {
    if (!best) return next;
    if (next.along > best.along + cell) return next;
    if (next.along > best.along - cell && next.across > best.across) return next;
    return best;
  };

  const scan = (minHalf: number): Stroke | null => {
    const found: { stroke: Stroke | null } = { stroke: null };
    const keep = (next: Stroke) => {
      found.stroke = consider(found.stroke, next);
    };
    for (let r = 0; r < rows; r++) {
      const y = minY + (r + 0.5) * cell;
      let start = -1;
      const flush = (end: number) => {
        if (start < 0) return;
        const len = end - start;
        const mid = (start + end - 1) * 0.5;
        const x = minX + (mid + 0.5) * cell;
        const i = r * cols + Math.min(cols - 1, Math.max(0, Math.round(mid)));
        keep({
          angle: 0,
          cx: x,
          cy: y,
          along: len * cell,
          across: Math.max(cell * 2, dist[i] * 2),
        });
        start = -1;
      };
      for (let c = 0; c <= cols; c++) {
        const x = minX + (c + 0.5) * cell;
        const ok = c < cols && inside[r * cols + c] === 1 && dist[r * cols + c] >= minHalf && !blocked(x, y);
        if (ok && start < 0) start = c;
        if (!ok && start >= 0) flush(c);
      }
    }
    for (let c = 0; c < cols; c++) {
      const x = minX + (c + 0.5) * cell;
      let start = -1;
      const flush = (end: number) => {
        if (start < 0) return;
        const len = end - start;
        const mid = (start + end - 1) * 0.5;
        const y = minY + (mid + 0.5) * cell;
        const i = Math.min(rows - 1, Math.max(0, Math.round(mid))) * cols + c;
        keep({
          angle: Math.PI / 2,
          cx: x,
          cy: y,
          along: len * cell,
          across: Math.max(cell * 2, dist[i] * 2),
        });
        start = -1;
      };
      for (let r = 0; r <= rows; r++) {
        const y = minY + (r + 0.5) * cell;
        const ok = r < rows && inside[r * cols + c] === 1 && dist[r * cols + c] >= minHalf && !blocked(x, y);
        if (ok && start < 0) start = r;
        if (!ok && start >= 0) flush(r);
      }
    }
    return found.stroke;
  };

  const useful = Math.max(12, span * 0.32);
  let chosen: Stroke | null = null;
  for (const minHalf of [2.6, 2.2, 1.8, 1.45, 1.1, 0.75]) {
    const run = scan(minHalf);
    if (!run) continue;
    chosen = run;
    if (run.along >= useful) break;
  }

  if (chosen) return chosen;
  const vertical = bounds.height >= bounds.width;
  return {
    angle: vertical ? Math.PI / 2 : 0,
    cx: (bounds.minX + bounds.maxX) / 2,
    cy: (bounds.minY + bounds.maxY) / 2,
    along: vertical ? bounds.height : bounds.width,
    across: Math.max(4, (vertical ? bounds.width : bounds.height) * 0.35),
  };
}

function highestInsetPoint(polys: Poly[], preferX: number) {
  let maxY = -Infinity;
  for (const poly of polys) {
    for (const p of poly) maxY = Math.max(maxY, p.y);
  }
  let best: Vector2 | null = null;
  let bestScore = Infinity;
  for (const poly of polys) {
    for (const p of poly) {
      if (p.y < maxY - 2.2) continue;
      const score = (maxY - p.y) * 4 + Math.abs(p.x - preferX);
      if (score < bestScore) {
        bestScore = score;
        best = p;
      }
    }
  }
  return best;
}

function engraveCutters(
  font: Font,
  text: string,
  letterPolys: Poly[],
  hole: { x: number; y: number; r: number },
  stroke: Stroke,
  spacing: number,
  samples: number,
): Poly[] {
  const writing = text.trim();
  if (writing.length < 2) return [];

  const raw = textShapes(font, writing, 100, spacing, samples);
  if (!raw.length) return [];
  const box = shapesBounds(raw);
  if (box.height < 0.5 || box.width < 0.5) return [];

  // Sit inside the stroke: height from local thickness, length from the run itself.
  const targetH = Math.min(6.8, Math.max(2.1, stroke.across * 0.52));
  const targetW = Math.max(8, stroke.along * 0.8);
  const scale = Math.min(targetH / box.height, targetW / box.width);
  const shapes = letterShapesMm(raw, scale, (box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2, samples);
  if (!shapes.length) return [];

  let polys = shapes.flatMap((shape) => shapeToPolys(shape, samples));
  polys = polys.map((poly) => rotatePoly(poly, stroke.angle));
  polys = polys.map((poly) => translatePoly(poly, stroke.cx, stroke.cy));

  const keepout = circlePoly(hole.x, hole.y, hole.r + 1.8, 36);
  const room = differencePolys(offsetPolys(letterPolys, -0.9), [keepout]);
  if (!room.length) return [];

  let cut = intersectionPolys(polys, room);
  if (!cut.length) return [];
  // A hair of extra stroke so the recess prints, without closing the letter gaps.
  const bold = offsetPolys(cut, 0.04);
  return bold.length ? bold : cut;
}

function punchHole(letterPolys: Poly[], holeR: number, wall: number, preferX: number) {
  let radius = holeR;
  for (let attempt = 0; attempt < 3; attempt++) {
    const inset = offsetPolys(letterPolys, -(radius + wall));
    const spot = inset.length ? highestInsetPoint(inset, preferX) : null;
    if (spot) return { x: spot.x, y: spot.y, r: radius };
    radius = Math.max(1.3, radius - 0.4);
  }
  return null;
}

/**
 * Comic letter charm: the letter is the object, a clasp hole punches the top,
 * and the name is a recess following the letter's longest stroke.
 */
export function buildLetterCharm(font: Font, params: KeychainParams, nameFont: Font = font): BuiltKeychain {
  const writing = formatName(params.name, params.textCase);
  const bigChar = resolveMonogramLetter(params, writing);
  const samples = Math.max(20, params.curveSegments);
  const height = Math.max(36, params.lengthMm);
  const thickness = Math.max(2.4, params.totalThicknessMm);
  const pocket = Math.min(Math.max(0.4, params.nameRaiseMm), thickness - 1.2);
  const holeR = Math.max(1.4, params.ringDiameterMm / 2);

  const rawLetter = textShapes(font, bigChar, 100, 0, samples);
  if (!rawLetter.length) {
    throw new Error("That letter could not be drawn. Try a bolder font (Fredoka, Righteous, Anton).");
  }
  const letterBox = shapesBounds(rawLetter);
  const letterScale = height / Math.max(letterBox.height, 1);
  const letterMm = letterShapesMm(
    rawLetter,
    letterScale,
    (letterBox.minX + letterBox.maxX) / 2,
    (letterBox.minY + letterBox.maxY) / 2,
    samples,
  );
  if (!letterMm.length) {
    throw new Error("That letter produced no printable solid. Try a bolder comic font.");
  }

  const letterPolys = letterMm.flatMap((shape) => shapeToPolys(shape, samples));
  const bounds = polyBounds(letterPolys);
  const hole = punchHole(letterPolys, holeR, Math.max(1.6, params.ringMarginMm * 0.65), (bounds.minX + bounds.maxX) / 2);
  if (!hole) {
    throw new Error("That letter is too thin for a clasp hole. Use Fredoka or Righteous, or shrink the hole.");
  }

  const stroke = longestStroke(letterPolys, hole);
  const cutters = params.layers.name
    ? engraveCutters(nameFont, writing, letterPolys, hole, stroke, params.letterSpacing, samples)
    : [];

  const holed = differencePolys(letterPolys, [circlePoly(hole.x, hole.y, hole.r, 40)]);
  const engraved = cutters.length ? differencePolys(holed, cutters) : holed;
  const floorD = thickness - pocket;
  const usePocket = cutters.length && engraved.length;

  const bodyShapes = polysToShapes(holed, true, 0.8);
  const topShapes = polysToShapes(usePocket ? engraved : holed, true, 0.8);
  if (!bodyShapes.length) {
    throw new Error("The clasp hole cut the letter apart. Shrink the hole or pick a thicker font.");
  }

  const parts: BuiltPart[] = [];
  if (params.layers.outer) {
    const geos: BufferGeometry[] = [];
    const push = (shapes: typeof bodyShapes, depth: number, z: number) => {
      for (const shape of shapes) {
        const geo = extrudeSolid(shape, depth, samples);
        if (!geo.getAttribute("position")) {
          geo.dispose();
          continue;
        }
        geo.translate(0, 0, z);
        geos.push(geo);
      }
    };
    if (usePocket && topShapes.length) {
      push(bodyShapes, floorD, 0);
      push(topShapes, pocket, floorD);
    } else {
      push(bodyShapes, thickness, 0);
    }
    if (!geos.length) throw new Error("Could not extrude that letter charm.");
    parts.push({
      id: "outer",
      name: "Letter charm",
      color: params.colors.outer,
      geometry: geos.length === 1 ? geos[0] : mergeParts(geos),
    });
  }

  if (!parts.length) throw new Error("Turn on the letter body to build a letter charm.");

  const box = new Box3();
  for (const part of parts) {
    part.geometry = prepare(part.geometry);
    if (part.geometry.boundingBox) box.union(part.geometry.boundingBox);
  }
  const midX = (box.min.x + box.max.x) / 2;
  const midY = (box.min.y + box.max.y) / 2;
  const liftZ = -box.min.z;
  for (const part of parts) part.geometry.translate(-midX, -midY, liftZ);

  const seated = new Box3();
  for (const part of parts) {
    part.geometry.computeBoundingBox();
    if (part.geometry.boundingBox) seated.union(part.geometry.boundingBox);
  }
  const size = new Vector3();
  seated.getSize(size);
  const volume = parts.reduce((sum, part) => sum + volumeOf(part.geometry), 0);
  return {
    parts,
    metrics: {
      widthMm: size.x,
      heightMm: size.y,
      thicknessMm: size.z,
      volumeMm3: volume,
      gramsPla: (volume / 1000) * PLA,
    },
  };
}

function mergeParts(geos: BufferGeometry[]) {
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  if (!merged) throw new Error("Could not combine the letter charm.");
  return merged;
}
