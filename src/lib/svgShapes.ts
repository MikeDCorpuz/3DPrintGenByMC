import { Path, Shape, Vector2 } from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

/**
 * Parse SVG markup into printable Three.js shapes (filled paths / polygons).
 * Best results: flat vector icons with path / polygon / rect / circle — not text, strokes-only, or rasters.
 */
export function svgToShapes(svgMarkup: string): Shape[] {
  const trimmed = svgMarkup.trim();
  if (!trimmed) return [];

  let data;
  try {
    data = new SVGLoader().parse(trimmed);
  } catch {
    throw new Error("That SVG could not be read. Export a plain vector SVG (paths), then try again.");
  }

  const shapes: Shape[] = [];
  for (const path of data.paths) {
    try {
      for (const shape of SVGLoader.createShapes(path)) {
        shapes.push(flipShapeY(shape));
      }
    } catch {
      // skip bad subpaths
    }
  }

  if (!shapes.length) {
    throw new Error(
      "No filled shapes found in that SVG. Use solid path artwork (not strokes-only or embedded images).",
    );
  }
  return shapes;
}

/** SVG Y grows downward; our print pipeline uses Y-up like font paths after centering. */
function flipShapeY(shape: Shape): Shape {
  const out = new Shape();
  const pts = shape.getPoints(72).map((p) => new Vector2(p.x, -p.y));
  if (pts.length < 3) return shape;
  out.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) out.lineTo(pts[i].x, pts[i].y);
  out.closePath();

  for (const hole of shape.holes) {
    const holePts = hole.getPoints(48).map((p) => new Vector2(p.x, -p.y));
    if (holePts.length < 3) continue;
    const h = new Path();
    h.moveTo(holePts[0].x, holePts[0].y);
    for (let i = 1; i < holePts.length; i++) h.lineTo(holePts[i].x, holePts[i].y);
    h.closePath();
    out.holes.push(h);
  }
  return out;
}
