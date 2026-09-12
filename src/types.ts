export type ProductType =
  | "keychain"
  | "clicker"
  | "clicker-v2"
  | "monogram"
  | "nameplate"
  | "pet-tag"
  | "letter-charm"
  | "letter-bead";
export type PlateShape = "rounded-rect" | "pill" | "tag" | "hexagon" | "circle";
export type KeychainType = "plate" | "cloud";
export type RingPosition = "left" | "right" | "top" | "bottom" | "none";
export type TextCase = "as-is" | "upper" | "lower" | "title";
export type SwitchStandard = "mx" | "standard-1u";
export type ClickerLayout = "connected" | "separate";
export type ClickerCapArt = "letter" | "svg";

export type LayerId = "housing" | "outer" | "outline" | "name";

export interface LayerToggles {
  housing: boolean;
  outer: boolean;
  outline: boolean;
  name: boolean;
}

export interface KeychainParams {
  productType: ProductType;
  name: string;
  fontId: string;
  scriptFontId: string;
  monogramLetter: string;
  monogramStandMm: number;
  monogramScriptAngleDeg: number;
  lengthMm: number;
  totalThicknessMm: number;
  nameRaiseMm: number;
  outlineRaiseMm: number;
  keychainType: KeychainType;
  shape: PlateShape;
  cornerRadiusMm: number;
  platePaddingMm: number;
  outlineWidthMm: number;
  ringPosition: RingPosition;
  ringDiameterMm: number;
  ringMarginMm: number;
  letterSpacing: number;
  textCase: TextCase;
  curveSegments: number;
  bevelEnabled: boolean;
  bevelSizeMm: number;
  layers: LayerToggles;
  colors: Record<LayerId, string>;
  bedGapMm: number;
  switchStandard: SwitchStandard;
  clickerPrintHousing: boolean;
  clickerPrintKeycap: boolean;
  clickerKeycapMm: number;
  clickerKeycapHeightMm: number;
  clickerKeycapRadiusMm: number;
  clickerStemClearanceMm: number;
  clickerSwitchClearanceMm: number;
  clickerPlateClearanceMm: number;
  clickerWallMm: number;
  clickerFloorMm: number;
  clickerWellMm: number;
  clickerPlateMm: number;
  clickerEjectHole: boolean;
  clickerLayout: ClickerLayout;
  clickerJoinMm: number;
  clickerLetterGapMm: number;
  clickerCapArt: ClickerCapArt;
  clickerSvg: string;
  clickerSvgName: string;
}

export function isClickerProduct(productType: ProductType) {
  return productType === "clicker" || productType === "clicker-v2";
}

export function isClickerV2(productType: ProductType) {
  return productType === "clicker-v2";
}

export function isMonogramProduct(productType: ProductType) {
  return productType === "monogram";
}

export function isNameplateProduct(productType: ProductType) {
  return productType === "nameplate";
}

export function isPetTagProduct(productType: ProductType) {
  return productType === "pet-tag";
}

export function isLetterCharmProduct(productType: ProductType) {
  return productType === "letter-charm";
}

export function isLetterBeadProduct(productType: ProductType) {
  return productType === "letter-bead";
}

/** Flat plate + raised-name products that share buildKeychain. */
export function isPlateProduct(productType: ProductType) {
  return productType === "keychain" || productType === "nameplate" || productType === "pet-tag";
}

export interface BuiltPart {
  id: LayerId;
  name: string;
  color: string;
  geometry: import("three").BufferGeometry;
}

export interface KeychainMetrics {
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  volumeMm3: number;
  gramsPla: number;
}

export interface BuiltKeychain {
  parts: BuiltPart[];
  metrics: KeychainMetrics;
}

export interface PlacedKeychain {
  label: string;
  x: number;
  y: number;
  keychain: BuiltKeychain;
}

export interface BuiltBatch {
  items: PlacedKeychain[];
  overflow: string[];
  bedSizeMm: number;
  metrics: KeychainMetrics & { count: number };
}

export const DEFAULT_PARAMS: KeychainParams = {
  productType: "keychain",
  name: "MICHAEL",
  fontId: "montserrat",
  scriptFontId: "pacifico",
  monogramLetter: "",
  monogramStandMm: 8,
  monogramScriptAngleDeg: 18,
  lengthMm: 72,
  totalThicknessMm: 3,
  nameRaiseMm: 0.8,
  outlineRaiseMm: 0.6,
  keychainType: "plate",
  shape: "rounded-rect",
  cornerRadiusMm: 3.2,
  platePaddingMm: 3.6,
  outlineWidthMm: 1.8,
  ringPosition: "left",
  ringDiameterMm: 5,
  ringMarginMm: 2.8,
  letterSpacing: 0,
  textCase: "as-is",
  curveSegments: 16,
  bevelEnabled: false,
  bevelSizeMm: 0.15,
  bedGapMm: 4,
  switchStandard: "mx",
  clickerPrintHousing: true,
  clickerPrintKeycap: true,
  clickerKeycapMm: 18.5,
  clickerKeycapHeightMm: 7.6,
  clickerKeycapRadiusMm: 1.8,
  clickerStemClearanceMm: 0.16,
  clickerSwitchClearanceMm: 0.35,
  clickerPlateClearanceMm: 0.2,
  clickerWallMm: 2.4,
  clickerFloorMm: 2,
  clickerWellMm: 8.4,
  clickerPlateMm: 1.6,
  clickerEjectHole: true,
  clickerLayout: "connected",
  clickerJoinMm: 7.2,
  clickerLetterGapMm: 1.6,
  clickerCapArt: "letter",
  clickerSvg: "",
  clickerSvgName: "",
  layers: { housing: true, outer: true, outline: true, name: true },
  colors: {
    housing: "#2A2E33",
    outer: "#C45C26",
    outline: "#1B1B1B",
    name: "#F4EFE6",
  },
};

export const PRESET_COLORS = [
  { name: "Ivory", hex: "#F4EFE6" },
  { name: "White", hex: "#F7F7F5" },
  { name: "Black", hex: "#1B1B1B" },
  { name: "Charcoal", hex: "#2A2E33" },
  { name: "Slate", hex: "#5C6570" },
  { name: "Copper", hex: "#C45C26" },
  { name: "Amber", hex: "#E8A317" },
  { name: "Gold", hex: "#D4AF37" },
  { name: "Red", hex: "#C0392B" },
  { name: "Crimson", hex: "#8B1E3F" },
  { name: "Forest", hex: "#2D5A3D" },
  { name: "Green", hex: "#2FA84F" },
  { name: "Teal", hex: "#1D6B65" },
  { name: "Navy", hex: "#1C3D5A" },
  { name: "Royal", hex: "#2F4B8A" },
  { name: "Lilac", hex: "#8E7CC3" },
  { name: "Pink", hex: "#D97B93" },
];
