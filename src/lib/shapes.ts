import { Path, Shape } from "three";
import type { PlateShape, RingPosition } from "../types";
import {
  circlePoly,
  differencePolys,
  polysToShapes,
  shapeToPolys,
  unionPolysLoose,
} from "./offset";

export interface PlateLayout {
  width: number;
  height: number;
  ringX: number;
  ringY: number;
  ringR: number;
  hasRing: boolean;
}

export function clampRadius(width: number, height: number, radius: number) {
  return Math.max(0.2, Math.min(radius, width / 2 - 0.05, height / 2 - 0.05));
}

export function makePlateShape(
  kind: PlateShape,
  width: number,
  height: number,
  radius: number,
): Shape {
  const w = width / 2;
  const h = height / 2;
  const r = clampRadius(width, height, radius);

  if (kind === "circle") {
    const rad = Math.max(w, h);
    const shape = new Shape();
    shape.absarc(0, 0, rad, 0, Math.PI * 2, false);
    return shape;
  }

  if (kind === "hexagon") {
    const shape = new Shape();
    const rx = w;
    const ry = h;
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const x = Math.cos(a) * rx;
      const y = Math.sin(a) * ry;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }

  if (kind === "pill") {
    const shape = new Shape();
    const rr = Math.min(w, h);
    shape.moveTo(-w + rr, -h);
    shape.lineTo(w - rr, -h);
    shape.absarc(w - rr, 0, rr, -Math.PI / 2, Math.PI / 2, false);
    shape.lineTo(-w + rr, h);
    shape.absarc(-w + rr, 0, rr, Math.PI / 2, (3 * Math.PI) / 2, false);
    shape.closePath();
    return shape;
  }

  if (kind === "tag") {
    const tip = Math.min(height * 0.42, width * 0.22);
    const shape = new Shape();
    const rr = Math.min(r, (height / 2) * 0.85);
    shape.moveTo(-w + rr, -h);
    shape.lineTo(w - tip, -h);
    shape.lineTo(w, 0);
    shape.lineTo(w - tip, h);
    shape.lineTo(-w + rr, h);
    shape.absarc(-w + rr, h - rr, rr, Math.PI / 2, Math.PI, false);
    shape.lineTo(-w, -h + rr);
    shape.absarc(-w + rr, -h + rr, rr, Math.PI, (3 * Math.PI) / 2, false);
    shape.closePath();
    return shape;
  }

  const shape = new Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.absarc(w - r, -h + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(w, h - r);
  shape.absarc(w - r, h - r, r, 0, Math.PI / 2, false);
  shape.lineTo(-w + r, h);
  shape.absarc(-w + r, h - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(-w, -h + r);
  shape.absarc(-w + r, -h + r, r, Math.PI, (3 * Math.PI) / 2, false);
  shape.closePath();
  return shape;
}

export function makeFrameShape(
  kind: PlateShape,
  outerW: number,
  outerH: number,
  innerW: number,
  innerH: number,
  outerR: number,
  innerR: number,
): Shape {
  const outer = makePlateShape(kind, outerW, outerH, outerR);
  const inner = makePlateShape(kind, innerW, innerH, innerR);
  const pts = inner.getPoints(48);
  if (pts.length > 2) {
    const hole = new Path();
    hole.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) hole.lineTo(pts[i].x, pts[i].y);
    hole.closePath();
    outer.holes.push(hole);
  }
  return outer;
}

export function ringCenter(
  position: RingPosition,
  width: number,
  height: number,
  holeR: number,
  margin: number,
): { x: number; y: number } | null {
  if (position === "none") return null;
  const inset = holeR + margin;
  switch (position) {
    case "left":
      return { x: -width / 2 + inset, y: 0 };
    case "right":
      return { x: width / 2 - inset, y: 0 };
    case "top":
      return { x: 0, y: height / 2 - inset };
    case "bottom":
      return { x: 0, y: -height / 2 + inset };
    default:
      return null;
  }
}

export function punchRing(shape: Shape, x: number, y: number, radius: number) {
  const hole = new Path();
  const n = 48;
  for (let i = 0; i < n; i++) {
    const a = (-i / n) * Math.PI * 2;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) hole.moveTo(px, py);
    else hole.lineTo(px, py);
  }
  hole.closePath();
  shape.holes.push(hole);
}

/**
 * Plate silhouette with a solid circular eyelet around the ring hole.
 * Unions the eyelet at full 2D footprint first, then punches the hole — so a sharp
 * tag tip (or thin edge) cannot leave a floating fragment that needs supports.
 */
export function makePlateWithRingEyelet(
  kind: PlateShape,
  width: number,
  height: number,
  radius: number,
  ring: { x: number; y: number } | null,
  holeR: number,
  margin: number,
  samples = 32,
): Shape {
  const plate = makePlateShape(kind, width, height, radius);
  if (!ring || holeR <= 0) return plate;

  const wall = Math.max(1.6, margin);
  const tabR = holeR + wall;
  const body = shapeToPolys(plate, Math.max(24, samples));
  if (!body.length) return plate;

  const tab = circlePoly(ring.x, ring.y, tabR, 48);
  const hole = circlePoly(ring.x, ring.y, holeR, 40);
  const united = differencePolys(unionPolysLoose([...body, tab]), [hole]);
  const shapes = polysToShapes(united, true, 0.5);
  if (!shapes.length) {
    // Fallback: punch in place (may still clip a tip, but better than empty).
    punchRing(plate, ring.x, ring.y, holeR);
    return plate;
  }
  // Prefer the largest outer contour as the printable body.
  let best = shapes[0];
  let bestArea = 0;
  for (const shape of shapes) {
    const pts = shape.getPoints(24);
    let area = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      area += pts[j].x * pts[i].y - pts[i].x * pts[j].y;
    }
    area = Math.abs(area) / 2;
    if (area > bestArea) {
      bestArea = area;
      best = shape;
    }
  }
  return best;
}
