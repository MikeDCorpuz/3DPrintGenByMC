import {
  Box3,
  BufferGeometry,
  Path,
  Shape,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Font } from "opentype.js";
import type { BuiltKeychain, BuiltPart, KeychainParams, LayerId } from "../types";
import { formatName } from "./fontCache";
import { letterShapesMm, shapesBounds, textShapes } from "./letters";
import { extrudeSolid } from "./extrude";
import { circlePoly, differencePolys, polysToShapes, unionPolys, type Poly } from "./offset";
import { makeFrameShape, makePlateShape, punchRing } from "./shapes";

const MX_BODY = 15.6;
const MX_PLATE = 14;
const MX_STEM_LEN = 4;
const MX_STEM_THICK = 1.31;
const MX_STEM_DEPTH = 5.1;
const PLA_DENSITY = 1.24;
const LAYER_ORDER: LayerId[] = ["housing", "outer", "outline", "name"];
const PRINT_GAP = 4;
const MAX_LETTERS = 12;

function plusHole(length: number, thick: number) {
  const L = length / 2;
  const T = thick / 2;
  const hole = new Path();
  hole.moveTo(-T, L);
  hole.lineTo(T, L);
  hole.lineTo(T, T);
  hole.lineTo(L, T);
  hole.lineTo(L, -T);
  hole.lineTo(T, -T);
  hole.lineTo(T, -L);
  hole.lineTo(-T, -L);
  hole.lineTo(-T, -T);
  hole.lineTo(-L, -T);
  hole.lineTo(-L, T);
  hole.lineTo(-T, T);
  hole.closePath();
  return hole;
}

function extrude(shape: Shape, depth: number, z: number, segments: number, _bevelMm = 0) {
  const geo = extrudeSolid(shape, Math.max(0.4, depth), Math.max(24, segments));
  geo.translate(0, 0, z);
  geo.computeVertexNormals();
  return geo;
}

function prepareMesh(geometry: BufferGeometry) {
  const welded = mergeVertices(geometry, 1e-4);
  if (welded !== geometry) geometry.dispose();
  welded.computeVertexNormals();
  welded.computeBoundingBox();
  return welded;
}

function mergeLayer(id: BuiltPart["id"], name: string, color: string, geos: BufferGeometry[]): BuiltPart | null {
  const usable = geos.filter((g) => g.getAttribute("position"));
  if (!usable.length) return null;
  const geometry = usable.length === 1 ? usable[0] : mergeGeometries(usable, false);
  if (!geometry) return null;
  if (usable.length > 1) usable.forEach((g) => g.dispose());
  return { id, name, color, geometry: prepareMesh(geometry) };
}

function combineParts(parts: BuiltPart[]): BuiltPart[] {
  const buckets = new Map<LayerId, BuiltPart[]>();
  for (const part of parts) {
    const list = buckets.get(part.id) ?? [];
    list.push(part);
    buckets.set(part.id, list);
  }
  const out: BuiltPart[] = [];
  for (const id of LAYER_ORDER) {
    const list = buckets.get(id);
    if (!list?.length) continue;
    if (list.length === 1) {
      out.push(list[0]);
      continue;
    }
    const merged = mergeLayer(
      id,
      list[0].name,
      list[0].color,
      list.map((part) => part.geometry),
    );
    if (merged) out.push(merged);
  }
  return out;
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

function housingOuter(params: KeychainParams) {
  const standard = params.switchStandard === "standard-1u";
  const cavity = MX_BODY + params.clickerSwitchClearanceMm;
  return standard
    ? Math.max(cavity + params.clickerWallMm * 2, 19.05)
    : cavity + params.clickerWallMm * 2;
}

function capSize(params: KeychainParams) {
  return params.switchStandard === "standard-1u" ? 19.05 : params.clickerKeycapMm;
}

export function clickerLetters(name: string) {
  return Array.from(name).filter((ch) => ch.trim());
}

function platePoly(width: number, height: number, radius: number, ox: number, oy: number, segs: number): Poly {
  return makePlateShape("rounded-rect", width, height, radius)
    .getPoints(Math.max(8, segs))
    .map((p) => new Vector2(p.x + ox, p.y + oy));
}

function finishClicker(parts: BuiltPart[]): BuiltKeychain {
  if (!parts.length) {
    throw new Error("Turn on the housing or the keycap to build a clicker.");
  }

  const bounds = new Box3();
  for (const part of parts) {
    part.geometry.computeBoundingBox();
    if (part.geometry.boundingBox) bounds.union(part.geometry.boundingBox);
  }
  const liftX = Number.isFinite(bounds.min.x) ? -((bounds.min.x + bounds.max.x) / 2) : 0;
  const liftY = Number.isFinite(bounds.min.y) ? -((bounds.min.y + bounds.max.y) / 2) : 0;
  const liftZ = Number.isFinite(bounds.min.z) ? -bounds.min.z : 0;
  if (Math.abs(liftX) > 1e-5 || Math.abs(liftY) > 1e-5 || Math.abs(liftZ) > 1e-5) {
    parts.forEach((part) => part.geometry.translate(liftX, liftY, liftZ));
  }

  const size3 = new Vector3();
  bounds.translate(new Vector3(liftX, liftY, liftZ));
  bounds.getSize(size3);
  const volume = parts.reduce((sum, part) => sum + volumeOf(part.geometry), 0);

  return {
    parts,
    metrics: {
      widthMm: size3.x,
      heightMm: size3.y,
      thicknessMm: size3.z,
      volumeMm3: volume,
      gramsPla: (volume / 1000) * PLA_DENSITY,
    },
  };
}

function addRingTab(
  geos: BufferGeometry[],
  params: KeychainParams,
  cx: number,
  cy: number,
  height: number,
  segs: number,
  bevel: number,
) {
  const inset = params.ringDiameterMm / 2 + params.ringMarginMm;
  const tabR = inset + 1.1;
  const ring = new Shape();
  ring.absarc(cx, cy, tabR, 0, Math.PI * 2, false);
  punchRing(ring, cx, cy, params.ringDiameterMm / 2);
  geos.push(extrude(ring, height, 0, segs, bevel));
}

function wellFrames(params: KeychainParams, x: number, y: number, segs: number, bevel: number) {
  const outer = housingOuter(params);
  const cavity = MX_BODY + params.clickerSwitchClearanceMm;
  const plateHole = MX_PLATE + params.clickerPlateClearanceMm;
  const radius = Math.min(params.cornerRadiusMm, outer / 4);
  const floor = params.clickerFloorMm;
  const well = params.clickerWellMm;
  const plate = params.clickerPlateMm;
  const walls = makeFrameShape("rounded-rect", outer, outer, cavity, cavity, radius, 0.4);
  const plateShape = makeFrameShape(
    "rounded-rect",
    outer,
    outer,
    plateHole,
    plateHole,
    radius,
    0.3,
  );
  const geos = [
    extrude(walls, well, floor, segs, bevel),
    extrude(plateShape, plate, floor + well, segs, bevel),
  ];
  geos.forEach((g) => g.translate(x, y, 0));
  return geos;
}

function buildSingleHousing(params: KeychainParams, offsetX: number): BuiltPart | null {
  if (!params.clickerPrintHousing || !params.layers.housing) return null;

  const outer = housingOuter(params);
  const radius = Math.min(params.cornerRadiusMm, outer / 4);
  const floor = params.clickerFloorMm;
  const segs = params.curveSegments;
  const bevel = params.bevelEnabled ? params.bevelSizeMm : 0;

  const floorShape = makePlateShape("rounded-rect", outer, outer, radius);
  if (params.clickerEjectHole) punchRing(floorShape, 0, 0, 4);

  const geos = [extrude(floorShape, floor, 0, segs, bevel), ...wellFrames(params, 0, 0, segs, bevel)];

  if (params.ringPosition !== "none") {
    const tab =
      params.ringPosition === "left" || params.ringPosition === "right"
        ? { x: params.ringPosition === "left" ? -outer / 2 + 1.4 : outer / 2 - 1.4, y: 0 }
        : { x: 0, y: params.ringPosition === "top" ? outer / 2 - 1.4 : -outer / 2 + 1.4 };
    addRingTab(geos, params, tab.x, tab.y, floor + 1.2, segs, bevel);
  }

  geos.forEach((g) => g.translate(offsetX, 0, 0));
  return mergeLayer("housing", "Switch housing", params.colors.housing, geos);
}

function connectedRing(
  params: KeychainParams,
  wells: { x: number; y: number }[],
  outer: number,
  bar: { x: number; y: number; w: number; h: number },
) {
  if (params.ringPosition === "none" || !wells.length) return null;
  const holeR = params.ringDiameterMm / 2;
  const margin = params.ringMarginMm;
  const overlap = 1.6;
  const first = wells[0];
  const last = wells[wells.length - 1];
  switch (params.ringPosition) {
    case "left":
      return { x: first.x - outer / 2 - holeR - margin + overlap, y: first.y, holeR };
    case "right":
      return { x: last.x + outer / 2 + holeR + margin - overlap, y: last.y, holeR };
    case "top":
      return { x: (first.x + last.x) / 2, y: first.y + outer / 2 + holeR + margin - overlap, holeR };
    case "bottom":
      return { x: bar.x, y: bar.y - bar.h / 2 - holeR - margin + overlap, holeR };
    default:
      return null;
  }
}

function buildConnectedHousing(
  params: KeychainParams,
  wells: { x: number; y: number }[],
  originX: number,
  originY: number,
): BuiltPart | null {
  if (!params.clickerPrintHousing || !params.layers.housing || !wells.length) return null;

  const outer = housingOuter(params);
  const radius = Math.min(params.cornerRadiusMm, outer / 4);
  const floor = params.clickerFloorMm;
  const segs = params.curveSegments;
  const bevel = params.bevelEnabled ? params.bevelSizeMm : 0;
  const overlap = 2.4;
  const barH = Math.max(4, params.clickerJoinMm);
  const first = wells[0];
  const last = wells[wells.length - 1];
  const bar = {
    x: (first.x + last.x) / 2,
    y: first.y - outer / 2 - barH / 2 + overlap,
    w: last.x - first.x + outer,
    h: barH,
  };
  const ring = connectedRing(params, wells, outer, bar);
  const tabR = ring ? ring.holeR + params.ringMarginMm + 1.1 : 0;

  const solids: Poly[] = [
    ...wells.map((well) => platePoly(outer, outer, radius, well.x, well.y, segs)),
    platePoly(bar.w, bar.h, Math.min(bar.h / 2, 3.2), bar.x, bar.y, segs),
  ];
  if (ring) solids.push(circlePoly(ring.x, ring.y, tabR, 48));

  const holes: Poly[] = [];
  if (params.clickerEjectHole) {
    for (const well of wells) holes.push(circlePoly(well.x, well.y, 4, 28));
  }
  if (ring) holes.push(circlePoly(ring.x, ring.y, ring.holeR, 40));

  const outline = holes.length ? differencePolys(unionPolys(solids), holes) : unionPolys(solids);
  const floorShapes = polysToShapes(outline);
  if (!floorShapes.length) return null;
  if (ring) {
    for (const shape of floorShapes) {
      if (!shape.holes.length) punchRing(shape, ring.x, ring.y, ring.holeR);
    }
  }

  const geos = floorShapes.map((shape) => extrude(shape, floor, 0, segs, bevel));
  for (const well of wells) {
    geos.push(...wellFrames(params, well.x, well.y, segs, bevel));
  }
  if (ring) {
    addRingTab(geos, params, ring.x, ring.y, floor + 1.2, segs, bevel);
  }

  geos.forEach((g) => g.translate(originX, originY, 0));
  return mergeLayer("housing", "Switch housing", params.colors.housing, geos);
}

function buildKeycap(
  font: Font,
  params: KeychainParams,
  offsetX: number,
  offsetY = 0,
  label?: string,
): BuiltPart[] {
  if (!params.clickerPrintKeycap) return [];

  const size = capSize(params);
  const radius = Math.min(params.clickerKeycapRadiusMm, size / 3);
  const well = MX_STEM_DEPTH;
  const face = Math.max(2.2, params.clickerKeycapHeightMm - well);
  const plusL = MX_STEM_LEN + params.clickerStemClearanceMm;
  const plusT = MX_STEM_THICK + params.clickerStemClearanceMm;
  const segs = params.curveSegments;
  const nameOn = params.layers.name;
  const outlineOn = params.layers.outline;
  const capOn = params.layers.outer;
  const nameRaise = nameOn ? params.nameRaiseMm : 0;
  const outlineRaise = outlineOn ? params.outlineRaiseMm : 0;
  const decor = Math.max(nameRaise, outlineRaise);
  const overlap = capOn && (nameOn || outlineOn) ? 0.35 : 0;
  const capBase = capOn ? Math.max(1.4, face - decor) : 0;
  const heights = {
    outer: capBase,
    outline: outlineRaise + overlap,
    name: nameRaise + overlap,
    baseZ: capOn ? Math.max(0, capBase - overlap) : 0,
  };

  const bevel = params.bevelEnabled ? params.bevelSizeMm : 0;
  const parts: BuiltPart[] = [];

  if (params.layers.outer && heights.outer > 0) {
    const faceShape = makePlateShape("rounded-rect", size, size, radius);
    const skirt = makePlateShape("rounded-rect", size, size, radius);
    skirt.holes.push(plusHole(plusL, plusT));
    const geos = [
      extrude(skirt, well, 0, segs),
      extrude(faceShape, heights.outer, well, segs, bevel),
    ];
    geos.forEach((g) => g.translate(offsetX, offsetY, 0));
    const part = mergeLayer("outer", "Keycap", params.colors.outer, geos);
    if (part) parts.push(part);
  }

  const text = label ?? formatName(params.name, params.textCase);
  const samples = Math.max(8, params.curveSegments);
  const rawShapes = textShapes(font, text, 100, params.letterSpacing, samples);
  if (!rawShapes.length) return parts;
  const box = shapesBounds(rawShapes);
  const pad = Math.max(1.2, params.platePaddingMm * 0.45);
  const rim = params.layers.outline ? params.outlineWidthMm : 0;
  const target = Math.max(6, size - pad * 2 - rim * 2);
  const scale = target / Math.max(box.width, box.height);
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  const topZ = well + heights.baseZ;

  if (params.layers.outline && heights.outline > 0) {
    const frame = makeFrameShape(
      "rounded-rect",
      size - pad,
      size - pad,
      size - pad - rim * 2,
      size - pad - rim * 2,
      Math.max(0.4, radius - pad / 2),
      Math.max(0.3, radius - pad / 2 - rim),
    );
    const geo = extrude(frame, heights.outline, topZ, segs, bevel);
    geo.translate(offsetX, offsetY, 0);
    const part = mergeLayer("outline", "Cap outline", params.colors.outline, [geo]);
    if (part) parts.push(part);
  }

  if (params.layers.name && heights.name > 0) {
    const geos: BufferGeometry[] = [];
    for (const shape of letterShapesMm(rawShapes, scale, cx, cy, samples)) {
      const geo = extrudeSolid(shape, Math.max(0.3, heights.name), samples);
      if (!geo.getAttribute("position") || !geo.getIndex()?.count) {
        geo.dispose();
        continue;
      }
      geo.translate(offsetX, offsetY, topZ);
      geos.push(geo);
    }
    const part = mergeLayer("name", "Letter", params.colors.name, geos);
    if (part) parts.push(part);
  }

  return parts;
}

function buildSeparateClicker(font: Font, params: KeychainParams): BuiltKeychain {
  const size = capSize(params);
  const housingW = housingOuter(params);
  const housingX = params.clickerPrintHousing && params.clickerPrintKeycap ? -(size + PRINT_GAP) / 2 : 0;
  const capX = params.clickerPrintHousing && params.clickerPrintKeycap ? (housingW + PRINT_GAP) / 2 : 0;

  const parts: BuiltPart[] = [];
  const housing = buildSingleHousing(params, housingX);
  if (housing) parts.push(housing);
  parts.push(...buildKeycap(font, params, capX));
  return finishClicker(parts);
}

function buildConnectedClicker(font: Font, params: KeychainParams): BuiltKeychain {
  const letters = clickerLetters(params.name);
  if (!letters.length) {
    throw new Error("Type a name so the clicker letters can join into one bar.");
  }
  if (letters.length > MAX_LETTERS) {
    throw new Error(`Keep the name to ${MAX_LETTERS} letters so it still fits a 256 mm bed.`);
  }

  const outer = housingOuter(params);
  const size = capSize(params);
  const pitch = outer + params.clickerLetterGapMm;
  const bodyW = letters.length * pitch - params.clickerLetterGapMm;
  const wells = letters.map((letter, i) => ({
    letter,
    x: -bodyW / 2 + outer / 2 + i * pitch,
    y: 0,
  }));

  const barH = Math.max(4, params.clickerJoinMm);
  const housingBottom = -outer / 2 - barH + 2.4;
  const printHousing = params.clickerPrintHousing && params.layers.housing;
  const printCaps = params.clickerPrintKeycap;
  const capY = printHousing ? housingBottom - PRINT_GAP - size / 2 : 0;

  let originX = 0;
  let originY = 0;
  if (printHousing && printCaps) {
    const housingTop = outer / 2;
    const capBottom = capY - size / 2;
    const groupH = housingTop - capBottom;
    originY = groupH / 2 - housingTop;
  }

  const parts: BuiltPart[] = [];
  const housing = buildConnectedHousing(params, wells, originX, originY);
  if (housing) parts.push(housing);
  for (const well of wells) {
    parts.push(...buildKeycap(font, params, well.x + originX, capY + originY, well.letter));
  }
  return finishClicker(combineParts(parts));
}

export function buildClicker(font: Font, params: KeychainParams): BuiltKeychain {
  return params.clickerLayout === "separate"
    ? buildSeparateClicker(font, params)
    : buildConnectedClicker(font, {
        ...params,
        clickerLayout: "connected",
        clickerJoinMm: params.clickerJoinMm ?? 7.2,
        clickerLetterGapMm: params.clickerLetterGapMm ?? 1.6,
      });
}
