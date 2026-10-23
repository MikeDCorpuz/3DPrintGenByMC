import { Vector2, type BufferGeometry, type Shape } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { BuiltPart, KeychainParams, LayerId, RingPosition } from "../types";
import {
  circlePoly,
  differencePolys,
  offsetPolys,
  polyBounds,
  polysToShapes,
  unionPolysLoose,
  type Poly,
} from "./offset";
import { punchRing, RING_NAME_GAP_MM } from "./shapes";
import { extrudeSolid } from "./extrude";

function cloudRingLayout(params: KeychainParams) {
  const holeR = params.ringDiameterMm / 2;
  const wall = Math.max(2.2, params.ringMarginMm);
  const tabR = holeR + wall;
  const puff = Math.max(0.8, params.platePaddingMm);
  const rim = params.layers.outline ? Math.max(0.6, params.outlineWidthMm) : 0;
  // Positive bite sinks the hole into the cloud so the tab welds to the name.
  const bite = puff + rim - RING_NAME_GAP_MM;
  const overlap = Math.max(wall * 0.8, wall + bite);
  const stickOut = Math.max(0, tabR * 2 - overlap);
  return { holeR, tabR, overlap, stickOut };
}

function extremeCrossing(polys: Poly[], alongX: boolean, at: number, wantMax: boolean) {
  let best: number | null = null;
  for (const poly of polys) {
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % n];
      const aT = alongX ? a.y : a.x;
      const bT = alongX ? b.y : b.x;
      const d = bT - aT;
      if (Math.abs(d) < 1e-9) continue;
      const lo = Math.min(aT, bT);
      const hi = Math.max(aT, bT);
      if (at < lo || at >= hi) continue;
      const aU = alongX ? a.x : a.y;
      const bU = alongX ? b.x : b.y;
      const u = aU + ((at - aT) / d) * (bU - aU);
      if (best === null || (wantMax ? u > best : u < best)) best = u;
    }
  }
  return best;
}

function silhouetteEdge(
  polys: Poly[],
  position: Exclude<RingPosition, "none">,
  bounds: ReturnType<typeof polyBounds>,
) {
  const alongX = position === "left" || position === "right";
  const wantMax = position === "right" || position === "top";
  const mid = alongX ? (bounds.minY + bounds.maxY) / 2 : (bounds.minX + bounds.maxX) / 2;
  const span = Math.max(1, alongX ? bounds.height : bounds.width);
  const hits: number[] = [];
  for (let i = -3; i <= 3; i++) {
    const at = mid + (i / 6) * span * 0.3;
    const hit = extremeCrossing(polys, alongX, at, wantMax);
    if (hit !== null) hits.push(hit);
  }
  hits.sort((a, b) => a - b);
  const edge = hits.length
    ? hits[Math.floor(hits.length / 2)]
    : wantMax
      ? alongX
        ? bounds.maxX
        : bounds.maxY
      : alongX
        ? bounds.minX
        : bounds.minY;
  return alongX ? { x: edge, y: mid } : { x: mid, y: edge };
}

function ringAnchor(polys: Poly[], position: RingPosition, tabR: number, overlap: number) {
  if (position === "none") return null;
  const edge = silhouetteEdge(polys, position, polyBounds(polys));
  switch (position) {
    case "left":
      return { x: edge.x - tabR + overlap, y: edge.y };
    case "right":
      return { x: edge.x + tabR - overlap, y: edge.y };
    case "top":
      return { x: edge.x, y: edge.y + tabR - overlap };
    case "bottom":
      return { x: edge.x, y: edge.y - tabR + overlap };
    default:
      return null;
  }
}

function withRing(cloud: Poly[], ring: { x: number; y: number; tabR: number; holeR: number } | null) {
  if (!ring) return cloud;
  const tab = circlePoly(ring.x, ring.y, ring.tabR, 48);
  const hole = circlePoly(ring.x, ring.y, ring.holeR, 40);
  return differencePolys(unionPolysLoose([...cloud, tab]), [hole]);
}

function punchShapes(shapes: Shape[], ring: { x: number; y: number; holeR: number } | null) {
  if (!ring) return shapes;
  for (const shape of shapes) {
    if (shape.holes.length) continue;
    punchRing(shape, ring.x, ring.y, ring.holeR);
  }
  return shapes;
}

function extrudePolys(
  shapes: Shape[],
  params: KeychainParams,
  depth: number,
  z: number,
) {
  return shapes.map((shape) => {
    const geo = extrudeSolid(shape, depth, Math.max(24, params.curveSegments));
    geo.translate(0, 0, z);
    geo.computeVertexNormals();
    return geo;
  });
}

export function letterOuters(shapes: Shape[], samples: number): Poly[] {
  return shapes
    .map((shape) => {
      const pts = shape.getPoints(Math.max(16, samples * 2));
      if (pts.length > 2) {
        const first = pts[0];
        const last = pts[pts.length - 1];
        if (first.distanceToSquared(last) < 1e-8) pts.pop();
      }
      return pts;
    })
    .filter((pts) => pts.length > 2);
}

export function scaleLetterPolys(
  shapes: Shape[],
  samples: number,
  scale: number,
  cx: number,
  cy: number,
): Poly[] {
  return letterOuters(shapes, samples).map((poly) =>
    poly.map((p) => new Vector2((p.x - cx) * scale, (p.y - cy) * scale)),
  );
}

export function buildCloudParts(
  letterPolys: Poly[],
  params: KeychainParams,
  heights: { outer: number; outline: number; name: number; baseZ: number; overlap?: number },
): BuiltPart[] {
  const puff = Math.max(0.8, params.platePaddingMm);
  const rim = params.layers.outline ? Math.max(0.6, params.outlineWidthMm) : 0;
  const letters = unionPolysLoose(letterPolys);
  const innerCloud = offsetPolys(letters, puff);
  const outerCloud = rim > 0 ? offsetPolys(letters, puff + rim) : innerCloud;
  if (!outerCloud.length) {
    throw new Error("Could not build a cloud outline for that name. Try more padding or another font.");
  }

  const layout = cloudRingLayout(params);
  const anchor = ringAnchor(outerCloud, params.ringPosition, layout.tabR, layout.overlap);
  const ring = anchor ? { ...anchor, tabR: layout.tabR, holeR: layout.holeR } : null;
  const innerRing = ring
    ? { ...ring, tabR: Math.max(layout.holeR + 1.2, layout.tabR - rim) }
    : null;

  const platePolys = withRing(outerCloud, ring);
  const outlinePolys =
    rim > 0 ? differencePolys(withRing(outerCloud, ring), withRing(innerCloud, innerRing)) : [];

  const parts: BuiltPart[] = [];

  if (params.layers.outer && heights.outer > 0) {
    const part = layerPart(
      "outer",
      "Outer plate",
      params.colors.outer,
      extrudePolys(punchShapes(polysToShapes(platePolys), ring), params, heights.outer, 0),
    );
    if (part) parts.push(part);
  }

  if (params.layers.outline && heights.outline > 0 && outlinePolys.length) {
    const part = layerPart(
      "outline",
      "Inner outline",
      params.colors.outline,
      extrudePolys(punchShapes(polysToShapes(outlinePolys), ring), params, heights.outline, heights.baseZ),
    );
    if (part) parts.push(part);
  }

  return parts;
}

function layerPart(
  id: LayerId,
  name: string,
  color: string,
  geos: BufferGeometry[],
): BuiltPart | null {
  if (!geos.length) return null;
  const geometry = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
  if (!geometry) return null;
  if (geos.length > 1) geos.forEach((g) => g.dispose());
  return { id, name, color, geometry };
}

export function cloudScaleExtras(params: KeychainParams) {
  const puff = Math.max(0.8, params.platePaddingMm);
  const rim = params.layers.outline ? Math.max(0.6, params.outlineWidthMm) : 0;
  const ringOn = params.ringPosition !== "none";
  const side = ringOn && (params.ringPosition === "left" || params.ringPosition === "right");
  const end = ringOn && (params.ringPosition === "top" || params.ringPosition === "bottom");
  const stickOut = ringOn ? cloudRingLayout(params).stickOut : 0;
  return {
    extraX: (puff + rim) * 2 + (side ? stickOut : 0),
    extraY: (puff + rim) * 2 + (end ? stickOut : 0),
  };
}
