import { Box3, BufferGeometry, Vector2, Vector3 } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Font } from "opentype.js";
import type { BuiltKeychain, BuiltPart, KeychainParams } from "../types";
import { formatName } from "./fontCache";
import { letterShapesMm, shapesBounds, textShapes } from "./letters";
import { extrudeSolid } from "./extrude";
import {
  differencePolys,
  offsetPolys,
  polyBounds,
  polysToShapes,
  shapeToPolys,
  signedArea,
  type Poly,
} from "./offset";

const PLA = 1.24;

function prepare(geometry: BufferGeometry) {
  const welded = mergeVertices(geometry, 1e-4);
  if (welded !== geometry) geometry.dispose();
  welded.computeVertexNormals();
  welded.computeBoundingBox();
  return welded;
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

function rectPoly(x0: number, y0: number, x1: number, y1: number, r = 0): Poly {
  const w = x1 - x0;
  const h = y1 - y0;
  const rr = Math.max(0, Math.min(r, w / 2 - 0.05, h / 2 - 0.05));
  if (rr < 0.2) {
    return [
      new Vector2(x0, y0),
      new Vector2(x1, y0),
      new Vector2(x1, y1),
      new Vector2(x0, y1),
    ];
  }
  const pts: Poly = [];
  const pushArc = (cx: number, cy: number, a0: number, a1: number) => {
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      pts.push(new Vector2(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
    }
  };
  pushArc(x1 - rr, y0 + rr, -Math.PI / 2, 0);
  pushArc(x1 - rr, y1 - rr, 0, Math.PI / 2);
  pushArc(x0 + rr, y1 - rr, Math.PI / 2, Math.PI);
  pushArc(x0 + rr, y0 + rr, Math.PI, (3 * Math.PI) / 2);
  return pts;
}

function asCcw(poly: Poly): Poly {
  return signedArea(poly) > 0 ? poly : [...poly].reverse();
}

export function resolveMonogramLetter(params: KeychainParams, name: string) {
  const override = (params.monogramLetter ?? "").trim();
  if (override) return override.slice(0, 1).toUpperCase();
  const cleaned = name.replace(/[^A-Za-z0-9]/g, "");
  return (cleaned[0] ?? "A").toUpperCase();
}

function finish(parts: BuiltPart[]): BuiltKeychain {
  if (!parts.length) throw new Error("Turn on at least one layer for the letter stand.");

  const box = new Box3();
  for (const part of parts) {
    part.geometry = prepare(part.geometry);
    if (part.geometry.boundingBox) box.union(part.geometry.boundingBox);
  }
  const midX = (box.min.x + box.max.x) / 2;
  const midY = (box.min.y + box.max.y) / 2;
  const liftZ = -box.min.z;
  for (const part of parts) {
    part.geometry.translate(-midX, -midY, liftZ);
    part.geometry.computeBoundingBox();
  }

  const seated = new Box3();
  for (const part of parts) {
    if (part.geometry.boundingBox) seated.union(part.geometry.boundingBox);
  }
  const size = new Vector3();
  seated.getSize(size);
  const volume = parts.reduce((sum, part) => sum + volumeOf(part.geometry), 0);
  return {
    parts,
    metrics: {
      widthMm: size.x,
      heightMm: size.y,
      thicknessMm: size.z,
      volumeMm3: volume,
      gramsPla: (volume / 1000) * PLA,
    },
  };
}

/**
 * Desk monogram: one big letter with a stand, optional rim, and script name across the face.
 */
export function buildMonogram(
  letterFont: Font,
  scriptFont: Font,
  params: KeychainParams,
): BuiltKeychain {
  const writing = formatName(params.name, params.textCase);
  const bigChar = resolveMonogramLetter(params, writing);
  const samples = Math.max(20, params.curveSegments);
  const height = Math.max(40, params.lengthMm);
  const depth = Math.max(8, params.totalThicknessMm);
  const standH = Math.max(4, params.monogramStandMm ?? 8);
  const standExtra = Math.max(2, depth * 0.35);

  const rawLetter = textShapes(letterFont, bigChar, 100, 0, samples);
  if (!rawLetter.length) {
    throw new Error("That big letter could not be drawn. Try another font or character.");
  }
  const letterBox = shapesBounds(rawLetter);
  const letterScale = height / letterBox.height;
  const letterMm = letterShapesMm(
    rawLetter,
    letterScale,
    (letterBox.minX + letterBox.maxX) / 2,
    (letterBox.minY + letterBox.maxY) / 2,
    samples,
  );
  if (!letterMm.length) {
    throw new Error("That big letter produced no printable solid.");
  }

  const letterPolys = letterMm.flatMap((shape) => shapeToPolys(shape, samples).map(asCcw));
  const bounds = polyBounds(letterPolys);
  const parts: BuiltPart[] = [];

  // Stand foot under the letter.
  const stand = rectPoly(
    bounds.minX - 2,
    bounds.minY - standH,
    bounds.maxX + 2,
    bounds.minY + Math.min(3.2, standH * 0.45),
    1.6,
  );
  const bodyPolys = [...letterPolys, asCcw(stand)];
  const bodyShapes = polysToShapes(bodyPolys, false, 0.5);
  if (!bodyShapes.length) {
    throw new Error("Could not build the letter stand body.");
  }

  if (params.layers.outer) {
    const geos = bodyShapes.map((shape) => {
      const geo = extrudeSolid(shape, depth + standExtra * 0.15, samples);
      return geo;
    });
    // Extra stand depth forward so it sits stably.
    const foot = polysToShapes([asCcw(stand)], false, 0.2);
    for (const shape of foot) {
      const geo = extrudeSolid(shape, depth + standExtra, samples);
      geos.push(geo);
    }
    const geometry = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (geometry) {
      if (geos.length > 1) geos.forEach((g) => g.dispose());
      parts.push({
        id: "outer",
        name: "Letter stand",
        color: params.colors.outer,
        geometry,
      });
    }
  }

  if (params.layers.outline && params.outlineWidthMm > 0.2 && params.outlineRaiseMm > 0.1) {
    const rimW = Math.max(0.8, params.outlineWidthMm);
    const outerCloud = offsetPolys(letterPolys, 0.05);
    const innerCloud = offsetPolys(letterPolys, -rimW);
    const rimPolys = innerCloud.length
      ? differencePolys(outerCloud.length ? outerCloud : letterPolys, innerCloud)
      : [];
    const rimShapes = polysToShapes(rimPolys, false, 0.2);
    if (rimShapes.length) {
      const geos = rimShapes.map((shape) => {
        const geo = extrudeSolid(shape, Math.max(0.6, params.outlineRaiseMm), samples);
        geo.translate(0, 0, depth);
        return geo;
      });
      const geometry = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
      if (geometry) {
        if (geos.length > 1) geos.forEach((g) => g.dispose());
        parts.push({
          id: "outline",
          name: "Letter rim",
          color: params.colors.outline,
          geometry,
        });
      }
    }
  }

  if (params.layers.name && params.nameRaiseMm > 0.1) {
    const rawScript = textShapes(scriptFont, writing, 100, params.letterSpacing, samples);
    if (!rawScript.length) {
      throw new Error("That name produced no drawable script. Try another font or text.");
    }
    const scriptBox = shapesBounds(rawScript);
    const angleDeg = params.monogramScriptAngleDeg ?? 18;
    // Positive Z rotation leans lower-left → upper-right on the letter face.
    const angle = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Fit the rotated AABB inside the letter face (lower-left → upper-right).
    const corners = [
      [scriptBox.minX, scriptBox.minY],
      [scriptBox.maxX, scriptBox.minY],
      [scriptBox.minX, scriptBox.maxY],
      [scriptBox.maxX, scriptBox.maxY],
    ].map(([x, y]) => {
      const lx = x - (scriptBox.minX + scriptBox.maxX) / 2;
      const ly = y - (scriptBox.minY + scriptBox.maxY) / 2;
      return { x: lx * cos - ly * sin, y: lx * sin + ly * cos };
    });
    const rotW = Math.max(...corners.map((c) => c.x)) - Math.min(...corners.map((c) => c.x));
    const rotH = Math.max(...corners.map((c) => c.y)) - Math.min(...corners.map((c) => c.y));
    const targetW = Math.max(12, bounds.width * 0.9);
    const targetH = Math.max(8, height * 0.52);
    const scriptScale = Math.min(targetW / Math.max(rotW, 1e-3), targetH / Math.max(rotH, 1e-3));
    const scriptMm = letterShapesMm(
      rawScript,
      scriptScale,
      (scriptBox.minX + scriptBox.maxX) / 2,
      (scriptBox.minY + scriptBox.maxY) / 2,
      samples,
    );
    const raise = Math.max(0.6, params.nameRaiseMm);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const geos = scriptMm.map((shape) => {
      const geo = extrudeSolid(shape, raise, samples);
      geo.rotateZ(angle);
      geo.translate(cx, cy, depth);
      return geo;
    });
    const usable = geos.filter((g) => g.getAttribute("position") && g.getIndex()?.count);
    if (usable.length) {
      const geometry = usable.length === 1 ? usable[0] : mergeGeometries(usable, false);
      if (geometry) {
        if (usable.length > 1) usable.forEach((g) => g.dispose());
        parts.push({
          id: "name",
          name: "Script name",
          color: params.colors.name,
          geometry,
        });
      }
    }
  }

  return finish(parts);
}
