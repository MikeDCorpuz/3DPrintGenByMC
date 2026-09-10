import ClipperLib from "clipper-lib";
import { Path, Shape, Vector2 } from "three";

const SCALE = 1000;

export type Poly = Vector2[];

function toClipper(polys: Poly[]) {
  return polys
    .filter((poly) => poly.length > 2)
    .map((poly) => {
      const pts = poly.map((p) => ({
        X: Math.round(p.x * SCALE),
        Y: Math.round(p.y * SCALE),
      }));
      const first = pts[0];
      const last = pts[pts.length - 1];
      if (first && last && first.X === last.X && first.Y === last.Y) {
        pts.pop();
      }
      return pts;
    })
    .filter((poly) => poly.length > 2);
}

function fromClipper(paths: { X: number; Y: number }[][], minArea = 0.8): Poly[] {
  return paths
    .map((path) => path.map((p) => new Vector2(p.X / SCALE, p.Y / SCALE)))
    .filter((poly) => Math.abs(signedArea(poly)) > minArea);
}

export function signedArea(points: Vector2[]) {
  let area = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    area += points[j].x * points[i].y - points[i].x * points[j].y;
  }
  return area / 2;
}

function perpDist(point: Vector2, a: Vector2, b: Vector2) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return point.distanceTo(a);
  return Math.abs(dy * point.x - dx * point.y + b.x * a.y - b.y * a.x) / len;
}

function rdp(points: Vector2[], epsilon: number): Vector2[] {
  if (points.length < 3) return points;
  let maxD = 0;
  let idx = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], first, last);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > epsilon) {
    const left = rdp(points.slice(0, idx + 1), epsilon);
    const right = rdp(points.slice(idx), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

export function simplifyPoly(poly: Poly, epsilon = 0.1): Poly {
  if (poly.length < 4) return poly;
  const ring = poly[0].distanceToSquared(poly[poly.length - 1]) < 1e-12 ? poly : [...poly, poly[0]];
  const simplified = rdp(ring, epsilon);
  const out: Poly = [];
  const minSep = (epsilon * 0.4) ** 2;
  for (const p of simplified) {
    const last = out[out.length - 1];
    if (!last || last.distanceToSquared(p) > minSep) out.push(p);
  }
  if (out.length > 2 && out[0].distanceToSquared(out[out.length - 1]) < minSep) out.pop();
  return out.length >= 3 ? out : poly;
}

function toPoly(path: { X: number; Y: number }[]): Poly {
  const pts = path.map((p) => new Vector2(p.X / SCALE, p.Y / SCALE));
  if (pts.length > 2) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (first && last && first.distanceToSquared(last) < 1e-12) pts.pop();
  }
  return pts;
}

function clipTree(subject: Poly[], clipPolys: Poly[], type: number, strictlySimple = true) {
  const tree = new ClipperLib.PolyTree();
  const clipper = new ClipperLib.Clipper();
  clipper.StrictlySimple = strictlySimple;
  const subj = toClipper(subject);
  if (!subj.length) return tree;
  clipper.AddPaths(subj, ClipperLib.PolyType.ptSubject, true);
  const clips = toClipper(clipPolys);
  if (clips.length) clipper.AddPaths(clips, ClipperLib.PolyType.ptClip, true);
  clipper.Execute(
    type,
    tree,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero,
  );
  return tree;
}

function clip(subject: Poly[], clipPolys: Poly[], type: number, strictlySimple = true): Poly[] {
  return fromClipper(ClipperLib.Clipper.PolyTreeToPaths(clipTree(subject, clipPolys, type, strictlySimple)));
}

export function unionPolys(polys: Poly[]): Poly[] {
  if (!polys.length) return [];
  return clip(polys, [], ClipperLib.ClipType.ctUnion);
}

export function unionPolysLoose(polys: Poly[]): Poly[] {
  if (!polys.length) return [];
  return clip(polys, [], ClipperLib.ClipType.ctUnion, false);
}

export function differencePolys(subject: Poly[], holes: Poly[]): Poly[] {
  if (!subject.length) return [];
  if (!holes.length) return unionPolys(subject);
  return clip(subject, holes, ClipperLib.ClipType.ctDifference);
}

export function offsetPolys(polys: Poly[], deltaMm: number): Poly[] {
  if (!polys.length) return [];
  if (Math.abs(deltaMm) < 0.01) return unionPolys(polys);
  const solution: { X: number; Y: number }[][] = [];
  const offset = new ClipperLib.ClipperOffset(2, 0.08 * SCALE);
  offset.AddPaths(
    toClipper(polys),
    ClipperLib.JoinType.jtRound,
    ClipperLib.EndType.etClosedPolygon,
  );
  offset.Execute(solution, deltaMm * SCALE);
  return unionPolysLoose(fromClipper(solution));
}

export function shapeToPolys(shape: Shape, samples = 16): Poly[] {
  const outer = shape.getPoints(Math.max(8, samples)).map((p) => new Vector2(p.x, p.y));
  if (outer.length > 2) {
    const first = outer[0];
    const last = outer[outer.length - 1];
    if (first && last && first.distanceToSquared(last) < 1e-8) outer.pop();
  }
  if (outer.length < 3) return [];
  const holes = shape.holes.map((hole) => {
    const pts = hole.getPoints(Math.max(8, samples)).map((p) => new Vector2(p.x, p.y));
    if (pts.length > 2) {
      const first = pts[0];
      const last = pts[pts.length - 1];
      if (first && last && first.distanceToSquared(last) < 1e-8) pts.pop();
    }
    return pts;
  }).filter((pts) => pts.length > 2);
  return holes.length ? differencePolys([outer], holes) : [outer];
}

export function circlePoly(x: number, y: number, radius: number, segments = 40): Poly {
  const pts: Vector2[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new Vector2(x + Math.cos(a) * radius, y + Math.sin(a) * radius));
  }
  return pts;
}

export function polyBounds(polys: Poly[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of polys) {
    for (const p of poly) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1 };
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function contourToPath(points: Poly, clockwise: boolean) {
  const ccw = signedArea(points) > 0;
  const wound = ccw === clockwise ? [...points].reverse() : points;
  const path = new Path();
  path.moveTo(wound[0].x, wound[0].y);
  for (let i = 1; i < wound.length; i++) path.lineTo(wound[i].x, wound[i].y);
  path.closePath();
  return path;
}

export function polysToShapes(polys: Poly[], strictlySimple = true, minOuter = 1.6): Shape[] {
  if (!polys.length) return [];
  const tree = clipTree(polys, [], ClipperLib.ClipType.ctUnion, strictlySimple);
  const ex = ClipperLib.JS.PolyTreeToExPolygons(tree);
  const shapes: Shape[] = [];
  for (const item of ex) {
    const outer = toPoly(item.outer ?? []);
    if (outer.length < 3 || Math.abs(signedArea(outer)) < minOuter) continue;
    const pts = signedArea(outer) > 0 ? outer : [...outer].reverse();
    const shape = new Shape();
    shape.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
    shape.closePath();
    for (const hole of item.holes ?? []) {
      const hp = toPoly(hole);
      if (hp.length < 3 || Math.abs(signedArea(hp)) < 0.35) continue;
      shape.holes.push(contourToPath(hp, true));
    }
    shapes.push(shape);
  }
  return shapes;
}
