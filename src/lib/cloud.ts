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
import { punchRing } from "./shapes";
import { extrudeSolid } from "./extrude";

function ringAnchor(
  bounds: ReturnType<typeof polyBounds>,
  position: RingPosition,
  tabR: number,
) {
  if (position === "none") return null;
  const overlap = 1.6;
  const midX = (bounds.minX + bounds.maxX) / 2;
  const midY = (bounds.minY + bounds.maxY) / 2;
  switch (position) {
    case "left":
      return { x: bounds.minX - tabR + overlap, y: midY };
    case "right":
      return { x: bounds.maxX + tabR - overlap, y: midY };
    case "top":
      return { x: midX, y: bounds.maxY + tabR - overlap };
    case "bottom":
      return { x: midX, y: bounds.minY - tabR + overlap };
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

  const holeR = params.ringDiameterMm / 2;
  const tabR = holeR + Math.max(2.2, params.ringMarginMm);
  const anchor = ringAnchor(polyBounds(outerCloud), params.ringPosition, tabR);
  const ring = anchor ? { ...anchor, tabR, holeR } : null;
  const innerRing = ring
    ? { ...ring, tabR: Math.max(holeR + 1.2, tabR - rim) }
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
  const ringExtra = ringOn
    ? params.ringDiameterMm + Math.max(2.2, params.ringMarginMm) * 2 - 1.6
    : 0;
  return {
    extraX: (puff + rim) * 2 + (side ? Math.max(0, ringExtra) : 0),
    extraY: (puff + rim) * 2 + (end ? Math.max(0, ringExtra) : 0),
  };
}
