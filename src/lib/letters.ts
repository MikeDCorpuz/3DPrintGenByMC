import type { Font } from "opentype.js";
import { Vector2, type Shape } from "three";
import { openPathToShapes } from "./pathToShapes";
import {
  differencePolys,
  offsetPolys,
  polysToShapes,
  shapeToPolys,
  signedArea,
  simplifyPoly,
  type Poly,
} from "./offset";

const LETTER_THICKEN_MM = 0.2;
const LETTER_SIMPLIFY_MM = 0.1;
const MIN_COUNTER_MM = 3.2;

export function textShapes(font: Font, text: string, fontSize: number, letterSpacing: number, samples: number) {
  const glyphs = font.stringToGlyphs(text);
  const shapes: Shape[] = [];
  let cursor = 0;
  const spacing = letterSpacing * fontSize * 0.01;
  const quality = Math.max(16, samples);

  for (const glyph of glyphs) {
    const path = glyph.getPath(cursor, 0, fontSize);
    shapes.push(...openPathToShapes(path, quality));
    const advance = glyph.advanceWidth
      ? (glyph.advanceWidth / font.unitsPerEm) * fontSize
      : fontSize * 0.5;
    cursor += advance + spacing;
  }
  return shapes;
}

function scalePoly(poly: Poly, scale: number, cx: number, cy: number): Poly {
  return poly.map((p) => new Vector2((p.x - cx) * scale, (p.y - cy) * scale));
}

function outerPoly(shape: Shape, samples: number): Poly {
  const pts = shape.getPoints(Math.max(16, samples * 2)).map((p) => new Vector2(p.x, p.y));
  if (pts.length > 2) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (first.distanceToSquared(last) < 1e-8) pts.pop();
  }
  return pts;
}

function contoursMm(shape: Shape, scale: number, cx: number, cy: number, samples: number): Poly[] {
  const raw = shapeToPolys(shape, samples);
  const src = raw.length ? raw : [outerPoly(shape, samples)];
  return src
    .map((poly) => simplifyPoly(scalePoly(poly, scale, cx, cy), LETTER_SIMPLIFY_MM))
    .filter((poly) => poly.length > 2 && Math.abs(signedArea(poly)) > 0.05);
}

function asCcw(poly: Poly): Poly {
  return signedArea(poly) > 0 ? poly : [...poly].reverse();
}

function asCw(poly: Poly): Poly {
  return signedArea(poly) < 0 ? poly : [...poly].reverse();
}

function polySpan(poly: Poly) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of poly) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { w: maxX - minX, h: maxY - minY };
}

function enlargeCounter(hole: Poly): Poly {
  const { w, h } = polySpan(hole);
  const extra = Math.min(0.4, Math.max(0.12, (MIN_COUNTER_MM - Math.min(w, h)) / 2));
  const grown = offsetPolys([asCcw(hole)], extra);
  if (!grown.length) return hole;
  const best = grown.reduce((a, b) => (Math.abs(signedArea(a)) >= Math.abs(signedArea(b)) ? a : b));
  return asCw(best);
}

function withCounters(body: Poly[], holes: Poly[]): Poly[] {
  if (!body.length) return body;
  if (!holes.length) return body;
  const grown = holes.map((hole) => asCcw(enlargeCounter(hole)));
  const punched = differencePolys(body, grown);
  const nested = polysToShapes(punched, false, 0.12);
  if (nested.length === 1 && nested[0].holes.length) return punched;
  return differencePolys(body, holes.map(asCcw));
}

export function letterShapesMm(
  shapes: Shape[],
  scale: number,
  cx: number,
  cy: number,
  samples: number,
): Shape[] {
  const result: Shape[] = [];
  for (const shape of shapes) {
    const scaled = contoursMm(shape, scale, cx, cy, samples);
    if (!scaled.length) continue;
    const solids = scaled.filter((poly) => signedArea(poly) > 0);
    const holes = scaled.filter((poly) => signedArea(poly) < 0);
    const body = offsetPolys(solids.length ? solids : scaled, LETTER_THICKEN_MM);
    const letter = withCounters(body.length ? body : solids, holes);
    const next = polysToShapes(letter.length ? letter : scaled, false, 0.12);
    if (next.length) result.push(...next);
  }
  return result;
}

export function letterOutersMm(shapes: Shape[], samples: number): Poly[] {
  return shapes
    .map((shape) => simplifyPoly(outerPoly(shape, samples), LETTER_SIMPLIFY_MM))
    .filter((poly) => poly.length > 2);
}

export function shapesBounds(shapes: { getPoints: (n?: number) => { x: number; y: number }[] }[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const shape of shapes) {
    const pts = shape.getPoints(24);
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1 };
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0.5, maxX - minX),
    height: Math.max(0.5, maxY - minY),
  };
}
