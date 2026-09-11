/// <reference types="vite/client" />

declare module "manifold-3d/manifold.wasm?url" {
  const url: string;
  export default url;
}

declare module "opentype.js" {
  export interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }

  export interface PathCommand {
    type: "M" | "L" | "C" | "Q" | "Z";
    x?: number;
    y?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
  }

  export class Path {
    commands: Array<{
      type: "M" | "L" | "C" | "Q" | "Z";
      x: number;
      y: number;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }>;
    getBoundingBox(): BoundingBox;
  }

  export interface Glyph {
    advanceWidth: number;
    getPath(x: number, y: number, fontSize: number): Path;
  }

  export class Font {
    unitsPerEm: number;
    stringToGlyphs(text: string): Glyph[];
    getPath(text: string, x: number, y: number, fontSize: number): Path;
  }

  export function parse(buffer: ArrayBuffer): Font;
  export function load(url: string): Promise<Font>;
}

declare module "clipper-lib" {
  interface IntPoint {
    X: number;
    Y: number;
  }
  type Path = IntPoint[];
  type Paths = Path[];

  interface PolyTree {
    Childs(): PolyNode[];
  }

  interface PolyNode {
    Contour(): Path;
    Childs(): PolyNode[];
    IsHole(): boolean;
  }

  interface ExPolygon {
    outer: Path;
    holes: Paths;
  }

  interface Clipper {
    StrictlySimple: boolean;
    AddPaths(paths: Paths, polyType: number, closed: boolean): boolean;
    Execute(clipType: number, solution: Paths | PolyTree, subjFill: number, clipFill: number): boolean;
  }

  interface ClipperOffset {
    AddPaths(paths: Paths, joinType: number, endType: number): void;
    Execute(solution: Paths, delta: number): void;
  }

  const ClipperLib: {
    Clipper: (new () => Clipper) & {
      PolyTreeToPaths(polytree: PolyTree): Paths;
    };
    PolyTree: new () => PolyTree;
    ClipperOffset: new (miterLimit?: number, arcTolerance?: number) => ClipperOffset;
    JoinType: { jtSquare: number; jtRound: number; jtMiter: number };
    EndType: { etClosedPolygon: number; etClosedLine: number };
    ClipType: { ctIntersection: number; ctUnion: number; ctDifference: number; ctXor: number };
    PolyType: { ptSubject: number; ptClip: number };
    PolyFillType: { pftEvenOdd: number; pftNonZero: number; pftPositive: number; pftNegative: number };
    JS: {
      PolyTreeToExPolygons(polytree: PolyTree): ExPolygon[];
    };
  };

  export default ClipperLib;
}
