import { PRODUCTS, productSwitchPatch } from "../lib/productDefaults";
import type { KeychainParams, ProductType } from "../types";

interface ProductTabsProps {
  params: KeychainParams;
  onChange: (patch: Partial<KeychainParams>) => void;
}

export function ProductTabs({ params, onChange }: ProductTabsProps) {
  const select = (productType: ProductType) => {
    onChange(productSwitchPatch(productType, params));
  };

  return (
    <nav className="shrink-0 border-b border-line bg-panel px-3 py-3" aria-label="Products">
      <div className="mb-2 px-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
        Product
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {PRODUCTS.map((product) => {
          const active = params.productType === product.id;
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => select(product.id)}
              className={`rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition ${
                active
                  ? "border-accent bg-accent text-ink shadow-sm shadow-black/20"
                  : "border-line bg-ink/40 text-muted hover:border-muted/60 hover:text-paper"
              }`}
            >
              {product.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
