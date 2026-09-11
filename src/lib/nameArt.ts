import type { Font } from "opentype.js";
import type { Shape } from "three";
import { shapesBounds, textShapes } from "./letters";
import { hasSvgToken, placeShape, splitNameSegments, translateShape } from "./nameTokens";
import { svgToShapes } from "./svgShapes";

/** Lay out letters and optional {svg} inserts on one baseline (font units). */
export function composeNameShapes(
  font: Font,
  text: string,
  svgMarkup: string,
  letterSpacing: number,
  samples: number,
): Shape[] {
  if (!hasSvgToken(text)) {
    return textShapes(font, text, 100, letterSpacing, samples);
  }
  if (!svgMarkup.trim()) {
    throw new Error("Add an SVG file for the {svg} spot in the name, or remove {svg}.");
  }

  let svgShapes: Shape[] = [];
  try {
    svgShapes = svgToShapes(svgMarkup);
  } catch (err) {
    throw err instanceof Error ? err : new Error("Could not read the SVG for {svg}.");
  }
  if (!svgShapes.length) {
    throw new Error("That SVG has no filled shapes to place in the name.");
  }

  const fontSize = 100;
  const gap = fontSize * 0.12;
  const placed: Shape[] = [];
  let cursor = 0;

  for (const seg of splitNameSegments(text)) {
    if (seg.kind === "svg") {
      const box = shapesBounds(svgShapes);
      const targetH = fontSize * 0.78;
      const scale = targetH / Math.max(box.height, 0.001);
      const width = box.width * scale;
      const cx = (box.minX + box.maxX) / 2;
      const cy = (box.minY + box.maxY) / 2;
      for (const shape of svgShapes) {
        placed.push(placeShape(shape, scale, cx, cy, cursor + width / 2, 0, samples));
      }
      cursor += width + gap;
      continue;
    }

    const chunk = seg.text;
    if (!chunk.trim()) {
      if (chunk.length) cursor += fontSize * 0.28 * Math.min(2, chunk.length);
      continue;
    }
    const shapes = textShapes(font, chunk, fontSize, letterSpacing, samples);
    if (!shapes.length) continue;
    const box = shapesBounds(shapes);
    const dx = cursor - box.minX;
    for (const shape of shapes) {
      placed.push(translateShape(shape, dx, 0, samples));
    }
    cursor = box.maxX + dx + gap;
  }

  return placed;
}
