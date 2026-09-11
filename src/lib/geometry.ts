import { Box3, BufferGeometry, Vector3 } from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Font } from "opentype.js";
import type { BuiltBatch, BuiltKeychain, BuiltPart, KeychainParams } from "../types";
import { isClickerProduct, isMonogramProduct, isNameplateProduct, isPetTagProduct } from "../types";
import { letterOutersMm, letterShapesMm, shapesBounds } from "./letters";
import { extrudeSolid } from "./extrude";
import { makeFrameShape, makePlateWithRingEyelet, punchRing, ringCenter } from "./shapes";
import { formatName } from "./fontCache";
import { BED_SIZE_MM, packOnBed } from "./layout";
import { parseNames } from "./names";
import { buildClicker } from "./clicker";
import { buildMonogram } from "./monogram";
import { buildCloudParts, cloudScaleExtras } from "./cloud";
import { composeNameShapes } from "./nameArt";

const PLA_DENSITY_G_CM3 = 1.24;

export type { BuiltKeychain } from "../types";

function lift(geometry: BufferGeometry, z: number) {
  geometry.translate(0, 0, z);
  return geometry;
}

function prepareMesh(geometry: BufferGeometry, weld = 1e-4) {
  let next = geometry;
  if (weld > 0) {
    const welded = mergeVertices(geometry, weld);
    if (welded !== geometry) geometry.dispose();
    next = welded;
  }
  next.computeVertexNormals();
  next.computeBoundingBox();
  return next;
}

function seatKeychain(parts: BuiltPart[]) {
  const box = new Box3();
  for (const part of parts) {
    part.geometry.computeBoundingBox();
    if (part.geometry.boundingBox) box.union(part.geometry.boundingBox);
  }
  if (!Number.isFinite(box.min.z)) return;
  const liftZ = -box.min.z;
  if (Math.abs(liftZ) < 1e-5) return;
  for (const part of parts) part.geometry.translate(0, 0, liftZ);
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

export function layerHeights(params: KeychainParams) {
  const nameOn = params.layers.name;
  const outlineOn = params.layers.outline;
  const outerOn = params.layers.outer;
  const nameRaise = nameOn ? params.nameRaiseMm : 0;
  const outlineRaise = outlineOn ? params.outlineRaiseMm : 0;
  const decor = Math.max(nameRaise, outlineRaise);
  const outer = outerOn
    ? Math.max(1.2, params.totalThicknessMm - decor)
    : 0;
  return {
    outer,
    outline: outlineRaise,
    name: nameRaise,
    total: (outerOn ? outer : 0) + decor,
    baseZ: outerOn ? outer : 0,
    overlap: 0,
  };
}

export function buildKeychain(font: Font, params: KeychainParams): BuiltKeychain {
  const nameplate = isNameplateProduct(params.productType);
  const petTag = isPetTagProduct(params.productType);
  const text = formatName(params.name, params.textCase);
  const heights = layerHeights(params);
  const samples = Math.max(20, params.curveSegments);

  const rawShapes = composeNameShapes(font, text, params.clickerSvg, params.letterSpacing, samples);
  if (!rawShapes.length) {
    throw new Error("That name produced no drawable letters. Try another font or text.");
  }
  const rawBox = shapesBounds(rawShapes);

  // Desk plates never get a key ring; pet tags keep a collar ring. Always a solid plate (not text-cloud).
  const ringPosition = nameplate ? "none" : params.ringPosition;
  const ringOn = ringPosition !== "none";
  const holeR = params.ringDiameterMm / 2;
  const ringBand = ringOn ? params.ringDiameterMm + params.ringMarginMm * 2 : 0;
  const sideRing = ringOn && (ringPosition === "left" || ringPosition === "right");
  const endRing = ringOn && (ringPosition === "top" || ringPosition === "bottom");

  const outlineW = params.layers.outline ? params.outlineWidthMm : 0;
  const pad = params.platePaddingMm;
  const cloud = !nameplate && !petTag && params.keychainType === "cloud";
  const extras = cloud
    ? cloudScaleExtras(params)
    : { extraX: pad * 2 + outlineW * 2 + (sideRing ? ringBand : 0) };

  const minLength = nameplate ? 60 : petTag ? 24 : 18;
  const targetLength = Math.max(minLength, extras.extraX + 8, params.lengthMm);
  const textScale = (targetLength - extras.extraX) / rawBox.width;
  const textW = rawBox.width * textScale;
  const textH = rawBox.height * textScale;

  const innerW = textW + pad * 2;
  const innerH = textH + pad * 2;
  const plateW = innerW + outlineW * 2 + (sideRing ? ringBand : 0);
  const plateH = Math.max(
    innerH + outlineW * 2 + (endRing ? ringBand : 0),
    ringOn ? params.ringDiameterMm + params.ringMarginMm * 2 + 2 : innerH,
  );

  const textOffsetX = cloud
    ? 0
    : (ringPosition === "left" ? ringBand / 2 : 0) +
      (ringPosition === "right" ? -ringBand / 2 : 0);
  const textOffsetY = cloud
    ? 0
    : (ringPosition === "top" ? -ringBand / 2 : 0) +
      (ringPosition === "bottom" ? ringBand / 2 : 0);

  const cx = (rawBox.minX + rawBox.maxX) / 2;
  const cy = (rawBox.minY + rawBox.maxY) / 2;
  const mmShapes = letterShapesMm(rawShapes, textScale, cx, cy, samples);

  const parts: BuiltPart[] = [];
  const ring = ringCenter(ringPosition, plateW, plateH, holeR, params.ringMarginMm);

  if (cloud) {
    if (!mmShapes.length) {
      throw new Error("That name produced no drawable letters. Try another font or text.");
    }
    parts.push(...buildCloudParts(letterOutersMm(mmShapes, samples), params, heights));
  } else if (params.layers.outer && heights.outer > 0) {
    const plate = makePlateWithRingEyelet(
      params.shape,
      plateW,
      plateH,
      params.cornerRadiusMm,
      ring,
      holeR,
      params.ringMarginMm,
      samples,
    );
    const geo = extrudeSolid(plate, heights.outer, Math.max(32, samples));
    parts.push({
      id: "outer",
      name: nameplate ? "Desk plate" : petTag ? "Pet tag" : "Outer plate",
      color: params.colors.outer,
      geometry: geo,
    });
  }

  if (!cloud && params.layers.outline && heights.outline > 0) {
    const frameW = innerW + outlineW * 2;
    const frameH = innerH + outlineW * 2;
    const frame = makeFrameShape(
      params.shape,
      frameW,
      frameH,
      innerW,
      innerH,
      Math.max(0.4, params.cornerRadiusMm - (sideRing || endRing ? 0 : 0)),
      Math.max(0.3, params.cornerRadiusMm - outlineW),
    );
    if (ring && !params.layers.outer) punchRing(frame, ring.x - textOffsetX, ring.y - textOffsetY, holeR);
    const geo = extrudeSolid(frame, heights.outline, Math.max(32, samples));
    lift(geo, heights.baseZ);
    geo.translate(textOffsetX, textOffsetY, 0);
    parts.push({
      id: "outline",
      name: nameplate ? "Plate frame" : petTag ? "Tag rim" : "Inner outline",
      color: params.colors.outline,
      geometry: geo,
    });
  }

  if (params.layers.name && heights.name > 0) {
    const letters = [...text].filter((ch) => !/\s/.test(ch));
    let letterIndex = 0;
    for (const shape of mmShapes) {
      const geo = extrudeSolid(shape, Math.max(0.6, heights.name), samples);
      const pos = geo.getAttribute("position");
      if (!pos || pos.count < 6 || !geo.getIndex()?.count) {
        geo.dispose();
        continue;
      }
      const label = letters[letterIndex] ?? "Name";
      letterIndex += 1;
      geo.translate(textOffsetX, textOffsetY, 0);
      // Sit just above the plate top so letter bottoms aren't coplanar with it.
      lift(geo, heights.baseZ + 0.05);
      parts.push({
        id: "name",
        name: `Letter ${label}`,
        color: params.colors.name,
        geometry: geo,
      });
    }
  }

  if (params.layers.name && heights.name > 0 && !parts.some((part) => part.id === "name")) {
    throw new Error("That name produced no drawable letters. Try another font or text.");
  }

  if (!parts.length) {
    throw new Error(
      nameplate
        ? "Turn on at least one layer to build a desk name plate."
        : petTag
          ? "Turn on at least one layer to build a pet tag."
          : "Turn on at least one layer to build a keychain.",
    );
  }

  for (const part of parts) {
    part.geometry = prepareMesh(part.geometry, 1e-4);
  }
  seatKeychain(parts);

  const bounds = new Box3();
  const tmp = new Box3();
  for (const part of parts) {
    part.geometry.computeBoundingBox();
    if (part.geometry.boundingBox) {
      tmp.copy(part.geometry.boundingBox);
      bounds.union(tmp);
    }
  }

  const size = new Vector3();
  bounds.getSize(size);
  const volume = parts.reduce((sum, part) => sum + volumeOf(part.geometry), 0);

  return {
    parts,
    metrics: {
      widthMm: size.x,
      heightMm: size.y,
      thicknessMm: size.z,
      volumeMm3: volume,
      gramsPla: (volume / 1000) * PLA_DENSITY_G_CM3,
    },
  };
}

export function disposeKeychain(built: BuiltKeychain | null) {
  built?.parts.forEach((part) => part.geometry.dispose());
}

export function disposeBatch(batch: BuiltBatch | null) {
  batch?.items.forEach((item) => disposeKeychain(item.keychain));
}

export function buildBatch(font: Font, params: KeychainParams, scriptFont?: Font): BuiltBatch {
  const labels = parseNames(params.name, params.textCase);
  const built = labels.map((label) => {
    const nextParams = { ...params, name: label, textCase: "as-is" as const };
    const keychain = isClickerProduct(params.productType)
      ? buildClicker(font, nextParams)
      : isMonogramProduct(params.productType)
        ? buildMonogram(font, scriptFont ?? font, nextParams)
        : buildKeychain(font, nextParams);
    return { label, keychain };
  });
  const packed = packOnBed(
    built.map(({ keychain }) => ({
      width: keychain.metrics.widthMm,
      height: keychain.metrics.heightMm,
    })),
    params.bedGapMm,
  );

  const overflow = packed.overflow.map((index) => built[index].label);
  packed.overflow.forEach((index) => disposeKeychain(built[index].keychain));

  const items = packed.placed.map((slot) => ({
    label: built[slot.index].label,
    x: slot.x,
    y: slot.y,
    keychain: built[slot.index].keychain,
  }));

  if (!items.length) {
    throw new Error(
      isClickerProduct(params.productType)
        ? "None of the clickers fit on the 256 × 256 mm bed. Reduce spacing or the letter list."
        : isMonogramProduct(params.productType)
          ? "None of the letter stands fit on the 256 × 256 mm bed. Reduce height or the name list."
          : isNameplateProduct(params.productType)
            ? "None of the name plates fit on the 256 × 256 mm bed. Reduce length or the name list."
            : isPetTagProduct(params.productType)
              ? "None of the pet tags fit on the 256 × 256 mm bed. Reduce length or the name list."
              : "None of the keychains fit on the 256 × 256 mm bed. Reduce length or the name list.",
    );
  }

  const volumeMm3 = items.reduce((sum, item) => sum + item.keychain.metrics.volumeMm3, 0);
  const thicknessMm = items.reduce(
    (max, item) => Math.max(max, item.keychain.metrics.thicknessMm),
    0,
  );

  return {
    items,
    overflow,
    bedSizeMm: BED_SIZE_MM,
    metrics: {
      count: items.length,
      widthMm: packed.usedWidth,
      heightMm: packed.usedHeight,
      thicknessMm,
      volumeMm3,
      gramsPla: items.reduce((sum, item) => sum + item.keychain.metrics.gramsPla, 0),
    },
  };
}
