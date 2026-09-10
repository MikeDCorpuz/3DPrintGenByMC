import { Path, Shape, Vector2 } from "three";
import type { Path as OpenPath } from "opentype.js";

interface Contour {
  points: Vector2[];
  area: number;
}

function cubicPoint(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  t: number,
) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  return new Vector2(
    uu * u * x0 + 3 * uu * t * x1 + 3 * u * tt * x2 + tt * t * x3,
    uu * u * y0 + 3 * uu * t * y1 + 3 * u * tt * y2 + tt * t * y3,
  );
}

function quadPoint(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number,
) {
  const u = 1 - t;
  return new Vector2(
    u * u * x0 + 2 * u * t * x1 + t * t * x2,
    u * u * y0 + 2 * u * t * y1 + t * t * y2,
  );
}

function signedArea(points: Vector2[]) {
  let area = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    area += points[j].x * points[i].y - points[i].x * points[j].y;
  }
  return area / 2;
}

function pointInPoly(point: Vector2, poly: Vector2[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function contourCentroid(points: Vector2[]) {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return new Vector2(x / points.length, y / points.length);
}

function flattenPath(path: OpenPath, samples: number): Vector2[][] {
  const contours: Vector2[][] = [];
  let current: Vector2[] = [];
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  const pushPoint = (p: Vector2) => {
    const last = current[current.length - 1];
    if (!last || last.distanceToSquared(p) > 1e-6) current.push(p);
  };

  const curveSteps = (length: number) => {
    const spacing = 2.5;
    return Math.max(4, Math.min(Math.max(12, samples), Math.ceil(length / spacing)));
  };

  for (const cmd of path.commands) {
    switch (cmd.type) {
      case "M":
        if (current.length > 2) contours.push(current);
        cx = cmd.x;
        cy = cmd.y;
        startX = cx;
        startY = cy;
        current = [new Vector2(cx, -cy)];
        break;
      case "L":
        cx = cmd.x;
        cy = cmd.y;
        pushPoint(new Vector2(cx, -cy));
        break;
      case "C": {
        const x1 = cmd.x1 ?? cx;
        const y1 = cmd.y1 ?? cy;
        const x2 = cmd.x2 ?? cmd.x;
        const y2 = cmd.y2 ?? cmd.y;
        const steps = curveSteps(
          Math.hypot(x1 - cx, y1 - cy) +
            Math.hypot(x2 - x1, y2 - y1) +
            Math.hypot(cmd.x - x2, cmd.y - y2),
        );
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const p = cubicPoint(cx, cy, x1, y1, x2, y2, cmd.x, cmd.y, t);
          pushPoint(new Vector2(p.x, -p.y));
        }
        cx = cmd.x;
        cy = cmd.y;
        break;
      }
      case "Q": {
        const x1 = cmd.x1 ?? cx;
        const y1 = cmd.y1 ?? cy;
        const steps = curveSteps(
          Math.hypot(x1 - cx, y1 - cy) + Math.hypot(cmd.x - x1, cmd.y - y1),
        );
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const p = quadPoint(cx, cy, x1, y1, cmd.x, cmd.y, t);
          pushPoint(new Vector2(p.x, -p.y));
        }
        cx = cmd.x;
        cy = cmd.y;
        break;
      }
      case "Z":
        pushPoint(new Vector2(startX, -startY));
        if (current.length > 2) contours.push(current);
        current = [];
        cx = startX;
        cy = startY;
        break;
      default:
        break;
    }
  }
  if (current.length > 2) contours.push(current);
  return contours;
}

function ensureWinding(points: Vector2[], counterclockwise: boolean) {
  const area = signedArea(points);
  const isCcw = area > 0;
  if (isCcw !== counterclockwise) {
    const reversed = [...points].reverse();
    return { points: reversed, area: -area };
  }
  return { points, area };
}

function toPath(points: Vector2[]) {
  const path = new Path();
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    path.lineTo(points[i].x, points[i].y);
  }
  path.closePath();
  return path;
}

export function openPathToShapes(path: OpenPath, samples = 8): Shape[] {
  const raw = flattenPath(path, samples)
    .map((points) => {
      if (points.length > 2) {
        const first = points[0];
        const last = points[points.length - 1];
        if (first.distanceToSquared(last) < 1e-6) points = points.slice(0, -1);
      }
      return { points, area: signedArea(points) };
    })
    .filter((c) => c.points.length > 2 && Math.abs(c.area) > 1e-4);

  if (!raw.length) return [];

  const solids: Contour[] = [];
  const holes: Contour[] = [];
  const byAbs = [...raw].sort((a, b) => Math.abs(b.area) - Math.abs(a.area));

  for (const candidate of byAbs) {
    const test = contourCentroid(candidate.points);
    let depth = 0;
    for (const other of byAbs) {
      if (other === candidate) continue;
      if (Math.abs(other.area) <= Math.abs(candidate.area)) continue;
      if (pointInPoly(test, other.points)) depth += 1;
    }
    if (depth % 2 === 1) holes.push(candidate);
    else solids.push(candidate);
  }

  if (!solids.length && raw.length) {
    solids.push(byAbs[0]);
    for (const extra of byAbs.slice(1)) holes.push(extra);
  }

  return solids.map((solid) => {
    const outer = ensureWinding(solid.points, true);
    const shape = new Shape();
    shape.moveTo(outer.points[0].x, outer.points[0].y);
    for (let i = 1; i < outer.points.length; i++) {
      shape.lineTo(outer.points[i].x, outer.points[i].y);
    }
    shape.closePath();

    for (const hole of holes) {
      const sample = contourCentroid(hole.points);
      if (!pointInPoly(sample, solid.points)) continue;
      const wound = ensureWinding(hole.points, false);
      shape.holes.push(toPath(wound.points));
    }
    return shape;
  });
}

