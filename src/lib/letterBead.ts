import { Box3, Vector2, Vector3, type BufferGeometry } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Font } from "opentype.js";
import type { BuiltBatch, BuiltKeychain, BuiltPart, KeychainParams } from "../types";
import { formatName } from "./fontCache";
import { letterShapesMm, shapesBounds, textShapes } from "./letters";
import { clickerTokens } from "./nameTokens";
import { extrudeSolid } from "./extrude";
import { svgToShapes } from "./svgShapes";
import { subtractCordHole } from "./repairMesh";
import {
  circlePoly,
  offsetPolys,
  polyBounds,
  polysToShapes,
  shapeToPolys,
  unionPolysLoose,
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

function cordSleeve(bounds: ReturnType<typeof polyBounds>, holeD: number): Poly[] {
  const radius = holeD / 2 + 1.6;
  const cy = (bounds.minY + bounds.maxY) / 2;
  // Just enough past the outline that the round hole opens on both sides, even on a C.
  const lip = 1.15;
  const x0 = bounds.minX - lip;
  const x1 = bounds.maxX + lip;
  const bar = [
    new Vector2(x0, cy - radius),
    new Vector2(x1, cy - radius),
    new Vector2(x1, cy + radius),
    new Vector2(x0, cy + radius),
  ];
  const cap = radius * 0.55;
  return unionPolysLoose([
    bar,
    circlePoly(x0 + cap * 0.15, cy, cap, 20),
    circlePoly(x1 - cap * 0.15, cy, cap, 20),
  ]);
}

function artShapes(font: Font, params: KeychainParams, samples: number) {
  const token = clickerTokens(formatName(params.name, params.textCase))[0];
  if (!token) throw new Error("Type a letter, or insert {svg} for an accent bead.");
  if (token.kind === "svg") {
    if (!params.clickerSvg.trim()) {
      throw new Error("Add an SVG for the accent bead, or remove {svg}.");
    }
    const shapes = svgToShapes(params.clickerSvg);
    if (!shapes.length) throw new Error("That SVG has no filled shapes to print.");
    return { shapes, accent: true as const, label: "SVG" };
  }
  const shapes = textShapes(font, token.ch, 100, 0, samples);
  if (!shapes.length) throw new Error(`Could not draw “${token.ch}”. Try a bolder font.`);
  return { shapes, accent: false as const, label: token.ch };
}

/**
 * One thick bead: cloud (or round accent) backing, raised letter or SVG, and a
 * left-to-right cord hole so the set strings into a word.
 */
export function buildLetterBead(font: Font, params: KeychainParams): BuiltKeychain {
  const samples = Math.max(20, params.curveSegments);
  const letterH = Math.max(16, params.lengthMm);
  const raise = params.layers.name ? Math.max(0.8, params.nameRaiseMm) : 0;
  const puff = Math.max(1.6, params.platePaddingMm);
  const { body, holeD } = beadCordSpec(params);

  const art = artShapes(font, params, samples);
  const box = shapesBounds(art.shapes);
  const scale = letterH / Math.max(art.accent ? Math.max(box.width, box.height) : box.height, 1);
  const glyphs = letterShapesMm(
    art.shapes,
    scale,
    (box.minX + box.maxX) / 2,
    (box.minY + box.maxY) / 2,
    samples,
  );
  if (!glyphs.length) throw new Error("That bead art produced no printable solid.");

  const glyphPolys = glyphs.flatMap((shape) => shapeToPolys(shape, samples));
  const glyphBox = polyBounds(glyphPolys);
  const cloud = art.accent
    ? [
        circlePoly(
          0,
          0,
          Math.max(glyphBox.width, glyphBox.height) / 2 + puff,
          48,
        ),
      ]
    : offsetPolys(unionPolysLoose(glyphPolys), puff);
  if (!cloud.length) throw new Error("Could not puff a cloud around that letter. Add a little more puff.");
  const sleeved = unionPolysLoose([...cloud, ...cordSleeve(polyBounds(cloud), holeD)]);
  if (!sleeved.length) throw new Error("Could not puff a cloud around that letter. Add a little more puff.");

  const bodyShapes = polysToShapes(sleeved, true, 0.8);
  if (!bodyShapes.length) throw new Error("The cloud outline did not form a solid bead.");

  const parts: BuiltPart[] = [];
  const geos: BufferGeometry[] = [];
  if (params.layers.outer) {
    for (const shape of bodyShapes) {
      const geo = extrudeSolid(shape, body, samples);
      if (!geo.getAttribute("position")) {
        geo.dispose();
        continue;
      }
      geos.push(geo);
    }
  }
  if (geos.length) {
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (geos.length > 1) geos.forEach((g) => g.dispose());
    if (merged) {
      parts.push({
        id: "outer",
        name: "Cloud bead",
        color: params.colors.outer,
        geometry: merged,
      });
    }
  }

  if (raise > 0) {
    const face: BufferGeometry[] = [];
    const inset = art.accent ? 0.92 : 1;
    for (const shape of glyphs) {
      const geo = extrudeSolid(shape, raise, samples);
      if (!geo.getAttribute("position")) {
        geo.dispose();
        continue;
      }
      if (inset !== 1) geo.scale(inset, inset, 1);
      geo.translate(0, 0, body);
      face.push(geo);
    }
    if (face.length) {
      const merged = face.length === 1 ? face[0] : mergeGeometries(face, false);
      if (face.length > 1) face.forEach((g) => g.dispose());
      if (merged) {
        parts.push({
          id: "name",
          name: art.accent ? "Accent" : "Letter",
          color: params.colors.name,
          geometry: merged,
        });
      }
    }
  }

  if (!parts.length) throw new Error("Turn on the cloud bead to print a letter bead.");

  const bounds = new Box3();
  for (const part of parts) {
    part.geometry = prepare(part.geometry);
    if (part.geometry.boundingBox) bounds.union(part.geometry.boundingBox);
  }
  const midX = (bounds.min.x + bounds.max.x) / 2;
  const midY = (bounds.min.y + bounds.max.y) / 2;
  for (const part of parts) part.geometry.translate(-midX, -midY, -bounds.min.z);

  const seated = new Box3();
  for (const part of parts) {
    part.geometry.computeBoundingBox();
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

export function beadCordSpec(params: KeychainParams) {
  const requestedHole = Math.max(2.4, params.ringDiameterMm);
  const body = Math.max(requestedHole + 4.2, params.totalThicknessMm);
  return {
    body,
    holeD: Math.min(requestedHole, body - 4.2),
  };
}

/** Cut the stringing hole after the beads exist. Preview and export both use this mesh. */
export async function punchLetterBeadCords(batch: BuiltBatch, params: KeychainParams) {
  const spec = beadCordSpec(params);
  for (const item of batch.items) {
    const span = Math.max(item.keychain.metrics.widthMm, item.keychain.metrics.heightMm);
    let volume = 0;
    for (const part of item.keychain.parts) {
      if (part.id !== "outer") {
        volume += volumeOf(part.geometry);
        continue;
      }
      const next = await subtractCordHole(part.geometry, spec.holeD / 2, span, spec.body / 2);
      if (next !== part.geometry) {
        part.geometry.dispose();
        part.geometry = prepare(next);
      }
      volume += volumeOf(part.geometry);
    }
    item.keychain.metrics.volumeMm3 = volume;
    item.keychain.metrics.gramsPla = (volume / 1000) * PLA;
  }
  batch.metrics.volumeMm3 = batch.items.reduce((sum, item) => sum + item.keychain.metrics.volumeMm3, 0);
  batch.metrics.gramsPla = batch.items.reduce((sum, item) => sum + item.keychain.metrics.gramsPla, 0);
}
