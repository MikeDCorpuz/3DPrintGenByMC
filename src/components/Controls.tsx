import { isClickerProduct, isLetterBeadProduct, isLetterCharmProduct, isMonogramProduct, isNameplateProduct, isPetTagProduct } from "../types";
import type { KeychainParams, LayerId } from "../types";
import { ClickerControls } from "./controls/ClickerControls";
import { KeychainControls } from "./controls/KeychainControls";
import { LetterBeadControls } from "./controls/LetterBeadControls";
import { LetterCharmControls } from "./controls/LetterCharmControls";
import { MonogramControls } from "./controls/MonogramControls";
import { NameplateControls } from "./controls/NameplateControls";
import { PetTagControls } from "./controls/PetTagControls";

interface ControlsProps {
  params: KeychainParams;
  onChange: (patch: Partial<KeychainParams>) => void;
  onColor: (layer: LayerId, hex: string) => void;
  onLayer: (layer: LayerId, on: boolean) => void;
}

export function Controls({ params, onChange, onColor, onLayer }: ControlsProps) {
  const props = { params, onChange, onColor, onLayer };

  if (isClickerProduct(params.productType)) {
    return <ClickerControls {...props} />;
  }
  if (isMonogramProduct(params.productType)) {
    return <MonogramControls {...props} />;
  }
  if (isNameplateProduct(params.productType)) {
    return <NameplateControls {...props} />;
  }
  if (isLetterBeadProduct(params.productType)) {
    return <LetterBeadControls {...props} />;
  }
  if (isLetterCharmProduct(params.productType)) {
    return <LetterCharmControls {...props} />;
  }
  if (isPetTagProduct(params.productType)) {
    return <PetTagControls {...props} />;
  }
  return <KeychainControls {...props} />;
}
