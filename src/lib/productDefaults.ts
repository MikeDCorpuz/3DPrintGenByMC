import {
  isClickerProduct,
  isMonogramProduct,
  isNameplateProduct,
  isPetTagProduct,
  isLetterCharmProduct,
  isLetterBeadProduct,
  type KeychainParams,
  type ProductType,
} from "../types";

const KEYCHAIN_COLORS = {
  housing: "#2A2E33",
  outer: "#C45C26",
  outline: "#1B1B1B",
  name: "#F4EFE6",
} as const;

function isSizedSpecial(productType: ProductType) {
  return (
    productType === "monogram" ||
    productType === "nameplate" ||
    productType === "pet-tag" ||
    productType === "letter-charm" ||
    productType === "letter-bead"
  );
}

/** Patch applied when the user switches the primary product tab. */
export function productSwitchPatch(
  next: ProductType,
  params: KeychainParams,
): Partial<KeychainParams> {
  if (next === params.productType) return { productType: next };

  if (isClickerProduct(next)) {
    return {
      productType: next,
      ringPosition: params.ringPosition === "none" ? "left" : params.ringPosition,
      clickerLayout: "connected",
      clickerPrintHousing: true,
      clickerPrintKeycap: true,
      layers: { housing: true, outer: true, outline: true, name: true },
      ...(isSizedSpecial(params.productType)
        ? {
            lengthMm: 72,
            totalThicknessMm: 3,
            nameRaiseMm: 0.8,
            outlineRaiseMm: 0.6,
            platePaddingMm: 3.6,
            outlineWidthMm: 1.8,
            colors: { ...KEYCHAIN_COLORS },
          }
        : {}),
      ...(next === "clicker-v2"
        ? {
            clickerLetterGapMm: 0.4,
            clickerJoinMm: 8.5,
            name: params.productType === "clicker-v2" ? params.name : params.name || "AIZA",
          }
        : {}),
    };
  }

  if (isMonogramProduct(next)) {
    return {
      productType: next,
      fontId: "cinzel",
      scriptFontId: "pacifico",
      lengthMm: 90,
      totalThicknessMm: 14,
      nameRaiseMm: 1.4,
      outlineRaiseMm: 0.9,
      outlineWidthMm: 2.4,
      monogramStandMm: 8,
      monogramScriptAngleDeg: 18,
      name: params.name || "Michael",
      layers: { housing: false, outer: true, outline: true, name: true },
      colors: {
        ...params.colors,
        outer: "#F7F7F5",
        outline: "#E8E8E6",
        name: "#2FA84F",
      },
    };
  }

  if (isNameplateProduct(next)) {
    return {
      productType: next,
      keychainType: "plate",
      shape: "rounded-rect",
      ringPosition: "none",
      lengthMm: 140,
      totalThicknessMm: 4.5,
      nameRaiseMm: 1.1,
      outlineRaiseMm: 0.8,
      outlineWidthMm: 2,
      platePaddingMm: 5.5,
      cornerRadiusMm: 4,
      fontId: params.fontId === "cinzel" ? "montserrat" : params.fontId,
      name: params.name || "MICHAEL",
      layers: { housing: false, outer: true, outline: true, name: true },
      colors: {
        ...params.colors,
        outer: "#1C3D5A",
        outline: "#D4AF37",
        name: "#F4EFE6",
      },
    };
  }

  if (isPetTagProduct(next)) {
    return {
      productType: next,
      keychainType: "plate",
      shape: "tag",
      ringPosition: "right",
      lengthMm: 48,
      totalThicknessMm: 3.6,
      nameRaiseMm: 1,
      outlineRaiseMm: 0.7,
      outlineWidthMm: 2,
      platePaddingMm: 4,
      cornerRadiusMm: 3.5,
      ringDiameterMm: 4.5,
      ringMarginMm: 2.6,
      fontId: params.fontId === "cinzel" ? "montserrat" : params.fontId,
      name: params.name || "MICHAEL",
      layers: { housing: false, outer: true, outline: true, name: true },
      colors: {
        ...params.colors,
        outer: "#1D6B65",
        outline: "#1B1B1B",
        name: "#F4EFE6",
      },
    };
  }

  if (isLetterCharmProduct(next)) {
    return {
      productType: next,
      fontId: "fredoka",
      scriptFontId: "fredoka",
      lengthMm: 58,
      totalThicknessMm: 3.2,
      nameRaiseMm: 0.7,
      ringDiameterMm: 4,
      ringMarginMm: 2.2,
      letterSpacing: 16,
      textCase: "upper",
      name: params.name || "MICHAEL",
      layers: { housing: false, outer: true, outline: false, name: true },
      colors: {
        ...params.colors,
        outer: "#F0D56A",
        name: "#C9A84A",
      },
    };
  }

  if (isLetterBeadProduct(next)) {
    return {
      productType: next,
      fontId: "titan-one",
      lengthMm: 28,
      totalThicknessMm: 11,
      nameRaiseMm: 1.8,
      platePaddingMm: 2.8,
      ringDiameterMm: 4.2,
      textCase: "upper",
      name: params.name || "MICHAEL",
      layers: { housing: false, outer: true, outline: false, name: true },
      colors: {
        ...params.colors,
        outer: "#9FD8EA",
        name: "#F6F1E7",
      },
    };
  }

  if (next === "keychain" && isSizedSpecial(params.productType)) {
    return {
      productType: next,
      keychainType: "plate",
      shape: "rounded-rect",
      lengthMm: 72,
      totalThicknessMm: 3,
      nameRaiseMm: 0.8,
      outlineRaiseMm: 0.6,
      platePaddingMm: 3.6,
      outlineWidthMm: 1.8,
      cornerRadiusMm: 3.2,
      ringPosition: "left",
      ringDiameterMm: 5,
      layers: { housing: true, outer: true, outline: true, name: true },
      colors: { ...KEYCHAIN_COLORS },
    };
  }

  return { productType: next };
}

export const PRODUCTS: { id: ProductType; label: string }[] = [
  { id: "keychain", label: "Keychain" },
  { id: "letter-charm", label: "Letter charm" },
  { id: "letter-bead", label: "Letter beads" },
  { id: "pet-tag", label: "Pet tag" },
  { id: "nameplate", label: "Name plate" },
  { id: "clicker", label: "Clicker" },
  { id: "clicker-v2", label: "Clicker v2" },
  { id: "monogram", label: "Letter stand" },
];
