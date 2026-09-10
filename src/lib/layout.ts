export const BED_SIZE_MM = 256;

export interface PackedSlot {
  index: number;
  x: number;
  y: number;
}

export interface PackResult {
  placed: PackedSlot[];
  overflow: number[];
  usedWidth: number;
  usedHeight: number;
}

export function packOnBed(
  sizes: { width: number; height: number }[],
  gap: number,
  bed = BED_SIZE_MM,
  margin = 4,
): PackResult {
  const placed: PackedSlot[] = [];
  const overflow: number[] = [];
  let cursorX = margin;
  let cursorY = margin;
  let rowHeight = 0;
  let usedWidth = margin;
  let usedHeight = margin;

  for (let i = 0; i < sizes.length; i++) {
    const width = sizes[i].width;
    const height = sizes[i].height;
    const fitsBed = width <= bed - margin * 2 && height <= bed - margin * 2;
    if (!fitsBed) {
      overflow.push(i);
      continue;
    }

    if (cursorX > margin && cursorX + width > bed - margin) {
      cursorX = margin;
      cursorY += rowHeight + gap;
      rowHeight = 0;
    }

    if (cursorY + height > bed - margin) {
      overflow.push(i);
      continue;
    }

    placed.push({
      index: i,
      x: cursorX + width / 2,
      y: cursorY + height / 2,
    });
    cursorX += width + gap;
    rowHeight = Math.max(rowHeight, height);
    usedWidth = Math.max(usedWidth, cursorX - gap);
    usedHeight = Math.max(usedHeight, cursorY + height);
  }

  return { placed, overflow, usedWidth, usedHeight };
}
