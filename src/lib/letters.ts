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

const LETTER_THICKEN_MM = 0.22;
const LETTER_SIMPLIFY_MM = 0.04;
const MIN_COUNTER_MM = 2.4;
const MIN_STROKE_MM = 1.15;

export function textShapes(font: Font, text: string, fontSize: number, letterSpacing: number, samples: number) {
  const glyphs = font.stringToGlyphs(text);
  const shapes: Shape[] = [];
  let cursor = 0;
  const spacing = letterSpacing * fontSize * 0.01;
  const quality = Math.max(24, samples);

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
  return { w: Math.max(0, maxX - minX), h: Math.max(0, maxY - minY) };
}

function minStroke(outer: Poly, hole: Poly) {
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

function prepareHole(outer: Poly, hole: Poly): Poly {
  const holeCcw = asCcw(hole);
  const span = polySpan(holeCcw);
  const minDim = Math.min(span.w, span.h);

  // Prefer keeping stroke width: shrink the counter while the outer grows.
  const shrunk = offsetPolys([holeCcw], -LETTER_THICKEN_MM);
  if (shrunk.length) {
    const candidate = shrunk.reduce((a, b) => (Math.abs(signedArea(a)) >= Math.abs(signedArea(b)) ? a : b));
    const candSpan = polySpan(candidate);
    if (Math.min(candSpan.w, candSpan.h) >= MIN_COUNTER_MM && minStroke(outer, candidate) >= MIN_STROKE_MM) {
      return asCw(candidate);
    }
  }

  // Counter already small: keep original if stroke is printable.
  if (minDim >= MIN_COUNTER_MM * 0.85 && minStroke(outer, holeCcw) >= MIN_STROKE_MM) {
    return asCw(holeCcw);
  }

  // Last resort: enlarge a little, but never thinner than MIN_STROKE_MM.
  const room = Math.max(0, minStroke(outer, holeCcw) - MIN_STROKE_MM);
  const extra = Math.min(0.35, Math.max(0, Math.min(room * 0.85, (MIN_COUNTER_MM - minDim) / 2)));
  if (extra > 0.02) {
    const grown = offsetPolys([holeCcw], extra);
    if (grown.length) {
      const candidate = grown.reduce((a, b) => (Math.abs(signedArea(a)) >= Math.abs(signedArea(b)) ? a : b));
      if (minStroke(outer, candidate) >= MIN_STROKE_MM * 0.95) return asCw(candidate);
    }
  }
  return asCw(holeCcw);
}

function thickenLetter(scaled: Poly[]): Poly[] {
  const solids = scaled.filter((poly) => signedArea(poly) > 0).map(asCcw);
  const holes = scaled.filter((poly) => signedArea(poly) < 0);
  if (!solids.length) return scaled;

  const body = offsetPolys(solids, LETTER_THICKEN_MM);
  if (!body.length) return solids;
  if (!holes.length) return body;

  const outer = body.reduce((a, b) => (Math.abs(signedArea(a)) >= Math.abs(signedArea(b)) ? a : b));
  const prepared = holes.map((hole) => asCcw(prepareHole(outer, hole)));
  const punched = differencePolys(body, prepared);
  const nested = polysToShapes(punched, false, 0.08);
  if (nested.some((shape) => shape.holes.length)) return punched;
  return differencePolys(body, holes.map((hole) => asCcw(hole)));
}

/**
 * Scale, thicken, then Clipper-union every glyph contour into clean printable shapes.
 * Overlapping script joins become one solid so extrusion does not leave internal faces.
 */
export function letterShapesMm(
  shapes: Shape[],
  scale: number,
  cx: number,
  cy: number,
  samples: number,
): Shape[] {
  const allPolys: Poly[] = [];
  for (const shape of shapes) {
    const scaled = contoursMm(shape, scale, cx, cy, samples);
    if (!scaled.length) continue;
    const letter = thickenLetter(scaled);
    allPolys.push(...(letter.length ? letter : scaled));
  }
  if (!allPolys.length) return [];

  const united = polysToShapes(allPolys, true, 0.08);
  if (united.length) return united;
  return polysToShapes(allPolys, false, 0.08);
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
