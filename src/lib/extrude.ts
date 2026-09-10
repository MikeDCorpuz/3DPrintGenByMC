import { BufferAttribute, BufferGeometry, ShapeUtils, Vector2, type Shape } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { polysToShapes, shapeToPolys, signedArea, type Poly } from "./offset";

function cleanRing(points: Vector2[], minDist = 0.02): Poly {
  const ring: Poly = [];
  for (const p of points) {
    const last = ring[ring.length - 1];
    if (!last || last.distanceToSquared(p) > minDist * minDist) {
      ring.push(new Vector2(p.x, p.y));
    }
  }
  if (ring.length > 2 && ring[0].distanceToSquared(ring[ring.length - 1]) < minDist * minDist) {
    ring.pop();
  }
  return ring;
}

function ringFrom(path: { getPoints: (n?: number) => { x: number; y: number }[] }, samples: number) {
  return cleanRing(path.getPoints(Math.max(32, samples)).map((p) => new Vector2(p.x, p.y)));
}

function pushWall(
  indices: number[],
  a: number,
  b: number,
  lift: number,
  invert: boolean,
) {
  if (a === b) return;
  const aTop = a + lift;
  const bTop = b + lift;
  if (invert) {
    indices.push(a, aTop, b, b, aTop, bTop);
  } else {
    indices.push(a, b, aTop, b, bTop, aTop);
  }
}

function extrudeRings(outerIn: Poly, holesIn: Poly[], depth: number): BufferGeometry {
  const outer = signedArea(outerIn) < 0 ? [...outerIn].reverse() : [...outerIn];
  if (outer.length < 3) return new BufferGeometry();
  const holes = holesIn
    .filter((ring) => ring.length >= 3)
    .map((ring) => (signedArea(ring) > 0 ? [...ring].reverse() : [...ring]));

  const faces = ShapeUtils.triangulateShape(outer, holes);
  if (!faces.length) return new BufferGeometry();

  const contour = outer.concat(...holes);
  const n = contour.length;
  const z = Math.max(0.2, depth);
  const positions = new Float32Array(n * 6);
  for (let i = 0; i < n; i++) {
    const p = contour[i];
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = 0;
    positions[(n + i) * 3] = p.x;
    positions[(n + i) * 3 + 1] = p.y;
    positions[(n + i) * 3 + 2] = z;
  }

  const indices: number[] = [];
  for (const face of faces) {
    if (face.length < 3 || face[0] === face[1] || face[1] === face[2] || face[2] === face[0]) continue;
    indices.push(face[0], face[2], face[1]);
    indices.push(n + face[0], n + face[1], n + face[2]);
  }

  for (let i = 0; i < outer.length; i++) {
    pushWall(indices, i, (i + 1) % outer.length, n, false);
  }
  let offset = outer.length;
  for (const hole of holes) {
    for (let i = 0; i < hole.length; i++) {
      pushWall(indices, offset + i, offset + ((i + 1) % hole.length), n, true);
    }
    offset += hole.length;
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(positions, 3));
  geo.setIndex(indices);
  return geo;
}

export function extrudeSolid(shape: Shape, depth: number, samples = 16): BufferGeometry {
  const quality = Math.max(32, samples);
  const outer = ringFrom(shape, quality);
  const holes = shape.holes.map((hole) => ringFrom(hole, quality)).filter((ring) => ring.length >= 3);
  const direct = extrudeRings(outer, holes, depth);
  if (direct.getIndex()?.count) return direct;

  const nested = polysToShapes(shapeToPolys(shape, quality), false, 0.05);
  const geos = (nested.length ? nested : [shape])
    .map((item) => {
      const nextOuter = ringFrom(item, quality);
      const nextHoles = item.holes.map((hole) => ringFrom(hole, quality)).filter((ring) => ring.length >= 3);
      return extrudeRings(nextOuter, nextHoles, depth);
    })
    .filter((geo) => (geo.getIndex()?.count ?? 0) > 0);

  if (!geos.length) return new BufferGeometry();
  if (geos.length === 1) return geos[0];
  const merged = mergeGeometries(geos, false);
  geos.forEach((geo) => geo.dispose());
  return merged ?? new BufferGeometry();
}
