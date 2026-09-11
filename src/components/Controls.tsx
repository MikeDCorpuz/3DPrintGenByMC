import type { ReactNode } from "react";
import { FONTS } from "../lib/fonts";
import {
  PRESET_COLORS,
  isClickerProduct,
  isClickerV2,
  isMonogramProduct,
  isNameplateProduct,
  type ClickerCapArt,
  type ClickerLayout,
  type KeychainParams,
  type KeychainType,
  type LayerId,
  type PlateShape,
  type ProductType,
  type RingPosition,
  type SwitchStandard,
  type TextCase,
} from "../types";

interface ControlsProps {
  params: KeychainParams;
  onChange: (patch: Partial<KeychainParams>) => void;
  onColor: (layer: LayerId, hex: string) => void;
  onLayer: (layer: LayerId, on: boolean) => void;
}

const PRODUCTS: { id: ProductType; label: string }[] = [
  { id: "keychain", label: "Keychain" },
  { id: "nameplate", label: "Name plate" },
  { id: "clicker", label: "Clicker" },
  { id: "clicker-v2", label: "Clicker v2" },
  { id: "monogram", label: "Letter stand" },
];

const SCRIPT_FONTS = FONTS.filter((font) => font.style === "script");
const LETTER_FONTS = FONTS.filter((font) => font.style === "serif" || font.style === "display" || font.style === "sans");

const LAYOUTS: { id: ClickerLayout; label: string }[] = [
  { id: "connected", label: "Name bar" },
  { id: "separate", label: "Separate" },
];

const CAP_ART: { id: ClickerCapArt; label: string }[] = [
  { id: "letter", label: "Letters + {svg}" },
  { id: "svg", label: "SVG on every cap" },
];

const SWITCHES: { id: SwitchStandard; label: string }[] = [
  { id: "mx", label: "MX switch" },
  { id: "standard-1u", label: "1u keyboard" },
];

const TYPES: { id: KeychainType; label: string }[] = [
  { id: "plate", label: "Plate" },
  { id: "cloud", label: "Text cloud" },
];

const SHAPES: { id: PlateShape; label: string }[] = [
  { id: "rounded-rect", label: "Rounded" },
  { id: "pill", label: "Pill" },
  { id: "tag", label: "Tag" },
  { id: "hexagon", label: "Hex" },
  { id: "circle", label: "Circle" },
];

const RINGS: { id: RingPosition; label: string }[] = [
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
  { id: "top", label: "Top" },
  { id: "bottom", label: "Bottom" },
  { id: "none", label: "None" },
];

const CASES: { id: TextCase; label: string }[] = [
  { id: "as-is", label: "As typed" },
  { id: "upper", label: "UPPER" },
  { id: "title", label: "Title" },
  { id: "lower", label: "lower" },
];

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          {label}
        </span>
        {value && <span className="font-mono text-[11px] text-paper/70">{value}</span>}
      </div>
      {children}
    </label>
  );
}

function ChipRow<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-md border px-2.5 py-1 text-xs transition ${
            value === opt.id
              ? "border-accent bg-accent/15 text-paper"
              : "border-line bg-ink/40 text-muted hover:border-muted/50 hover:text-paper"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function LayerCard({
  id,
  title,
  hint,
  params,
  onLayer,
  onColor,
}: {
  id: LayerId;
  title: string;
  hint: string;
  params: KeychainParams;
  onLayer: (layer: LayerId, on: boolean) => void;
  onColor: (layer: LayerId, hex: string) => void;
}) {
  const on = params.layers[id];
  return (
    <div className={`rounded-xl border p-3 ${on ? "border-line bg-ink/50" : "border-line/70 bg-ink/20 opacity-70"}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-[11px] text-muted">{hint}</div>
        </div>
        <button
          type="button"
          onClick={() => onLayer(id, !on)}
          className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${
            on ? "bg-accent text-ink" : "bg-line text-muted"
          }`}
        >
          {on ? "On" : "Off"}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={params.colors[id]}
          onChange={(e) => onColor(id, e.target.value)}
        />
        <div className="flex flex-wrap gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={`${id}-${c.hex}`}
              type="button"
              title={c.name}
              onClick={() => onColor(id, c.hex)}
              className="h-4 w-4 rounded-sm border border-white/10"
              style={{ background: c.hex }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function Controls({ params, onChange, onColor, onLayer }: ControlsProps) {
  const clicker = isClickerProduct(params.productType);
  const clickerV2 = isClickerV2(params.productType);
  const monogram = isMonogramProduct(params.productType);
  const nameplate = isNameplateProduct(params.productType);
  const connected = clicker && (clickerV2 || params.clickerLayout === "connected");
  return (
    <div className="scrollbar-thin flex h-full flex-col gap-6 overflow-y-auto p-5">
      <section className="space-y-3">
        <Field label="Product">
          <ChipRow
            value={params.productType}
            options={PRODUCTS}
            onChange={(productType) =>
              onChange({
                productType,
                ...(isClickerProduct(productType)
                  ? {
                      ringPosition:
                        params.ringPosition === "none" ? ("left" as const) : params.ringPosition,
                      clickerLayout: "connected" as const,
                      clickerPrintHousing: true,
                      clickerPrintKeycap: true,
                      layers: {
                        housing: true,
                        outer: true,
                        outline: true,
                        name: true,
                      },
                      ...(params.productType === "monogram" || params.productType === "nameplate"
                        ? {
                            lengthMm: 72,
                            totalThicknessMm: 3,
                            nameRaiseMm: 0.8,
                            outlineRaiseMm: 0.6,
                            platePaddingMm: 3.6,
                            outlineWidthMm: 1.8,
                            colors: {
                              housing: "#2A2E33",
                              outer: "#C45C26",
                              outline: "#1B1B1B",
                              name: "#F4EFE6",
                            },
                          }
                        : {}),
                      ...(productType === "clicker-v2"
                        ? {
                            clickerLetterGapMm: 0.4,
                            clickerJoinMm: 8.5,
                            name:
                              params.productType === "clicker-v2" ? params.name : params.name || "AIZA",
                          }
                        : {}),
                    }
                  : isMonogramProduct(productType) && params.productType !== "monogram"
                    ? {
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
                      }
                    : isNameplateProduct(productType) && params.productType !== "nameplate"
                      ? {
                          keychainType: "plate" as const,
                          shape: "rounded-rect" as const,
                          ringPosition: "none" as const,
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
                        }
                      : productType === "keychain" &&
                          (params.productType === "monogram" || params.productType === "nameplate")
                        ? {
                            lengthMm: 72,
                            totalThicknessMm: 3,
                            nameRaiseMm: 0.8,
                            outlineRaiseMm: 0.6,
                            platePaddingMm: 3.6,
                            outlineWidthMm: 1.8,
                            cornerRadiusMm: 3.2,
                            ringPosition: "left" as const,
                            layers: {
                              housing: true,
                              outer: true,
                              outline: true,
                              name: true,
                            },
                            colors: {
                              housing: "#2A2E33",
                              outer: "#C45C26",
                              outline: "#1B1B1B",
                              name: "#F4EFE6",
                            },
                          }
                        : {}),
              })
            }
          />
        </Field>
        <Field
          label={monogram ? "Script name" : clicker && !connected ? "Letters" : "Names"}
          value={`${params.name.split(",").filter((part) => part.trim()).length || 1} on bed`}
        >
          <textarea
            value={params.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={
              monogram
                ? "Michael, Alex"
                : nameplate
                  ? "Michael {svg} Corpuz"
                  : connected
                    ? "Michael {svg} Corpuz"
                    : clicker
                      ? "M, A, S"
                      : "Michael {svg} Corpuz, Alex"
            }
            rows={4}
            className="w-full resize-y rounded-lg border border-line bg-ink px-3 py-2.5 text-base leading-relaxed outline-none ring-accent/40 focus:ring-2"
          />
          {!monogram && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-line bg-ink/40 px-2.5 py-1 text-[11px] text-fog hover:border-accent/50"
                onClick={() => {
                  const insert = params.name.trim() ? " {svg} " : "{svg}";
                  onChange({ name: `${params.name}${insert}` });
                }}
              >
                Insert {"{svg}"}
              </button>
              {params.clickerSvgName ? (
                <span className="text-[11px] text-muted">SVG ready: {params.clickerSvgName}</span>
              ) : (
                <span className="text-[11px] text-muted">Upload an SVG below, then place {"{svg}"} in the name</span>
              )}
            </div>
          )}
          <p className="text-[11px] leading-relaxed text-muted">
            {monogram
              ? "Small writing across the big letter. Commas print more than one stand. The big letter defaults to the first letter of each name."
              : nameplate
                ? 'Long desk plate — use Michael {svg} Corpuz to raise your icon between words. Commas print more than one plate.'
                : clickerV2
                  ? 'Linked name-bar: each letter is a well, and {svg} becomes its own icon well in the row. Commas print more than one name.'
                  : connected
                    ? 'Type a name. Put {svg} where the icon should sit (e.g. Michael {svg} Corpuz). Commas print more than one name.'
                    : clicker
                      ? "One letter per clicker works best. Separate with commas to print a set."
                      : 'Separate names with commas. Use {svg} in a name to place your uploaded icon inline.'}
          </p>
        </Field>
        {!monogram && !clicker && (
          <Field label="Inline SVG">
            <label className="flex cursor-pointer flex-col gap-1 rounded-lg border border-dashed border-line bg-ink/40 px-3 py-3 text-center hover:border-accent/50">
              <span className="text-sm text-fog">
                {params.clickerSvgName ? params.clickerSvgName : "Choose an .svg file"}
              </span>
              <span className="text-[11px] text-muted">Used wherever you type {"{svg}"} in the name</span>
              <input
                type="file"
                accept=".svg,image/svg+xml"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  onChange({
                    clickerSvg: await file.text(),
                    clickerSvgName: file.name,
                  });
                }}
              />
            </label>
            {params.clickerSvg ? (
              <button
                type="button"
                className="mt-2 text-[11px] text-muted underline hover:text-fog"
                onClick={() => onChange({ clickerSvg: "", clickerSvgName: "" })}
              >
                Clear SVG
              </button>
            ) : null}
          </Field>
        )}
        {monogram && (
          <Field label="Big letter">
            <input
              type="text"
              maxLength={1}
              value={params.monogramLetter}
              onChange={(e) => onChange({ monogramLetter: e.target.value.slice(0, 1) })}
              placeholder="Auto from name"
              className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none ring-accent/40 focus:ring-2"
            />
            <p className="text-[11px] leading-relaxed text-muted">
              Leave blank to use the first letter of each script name.
            </p>
          </Field>
        )}
        <Field label="Text case">
          <ChipRow
            value={params.textCase}
            options={CASES}
            onChange={(textCase) => onChange({ textCase })}
          />
        </Field>
        <Field label={monogram ? "Big letter font" : "Font"}>
          <select
            value={params.fontId}
            onChange={(e) => onChange({ fontId: e.target.value })}
            className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none ring-accent/40 focus:ring-2"
          >
            {monogram
              ? (["serif", "display", "sans"] as const).map((style) => (
                  <optgroup key={style} label={style.toUpperCase()}>
                    {LETTER_FONTS.filter((f) => f.style === style).map((font) => (
                      <option key={font.id} value={font.id}>
                        {font.name} — {font.designer}
                      </option>
                    ))}
                  </optgroup>
                ))
              : (["sans", "serif", "display", "script", "mono"] as const).map((style) => (
                  <optgroup key={style} label={style.toUpperCase()}>
                    {FONTS.filter((f) => f.style === style).map((font) => (
                      <option key={font.id} value={font.id}>
                        {font.name} — {font.designer}
                      </option>
                    ))}
                  </optgroup>
                ))}
          </select>
        </Field>
        {monogram && (
          <Field label="Script font">
            <select
              value={params.scriptFontId}
              onChange={(e) => onChange({ scriptFontId: e.target.value })}
              className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none ring-accent/40 focus:ring-2"
            >
              {SCRIPT_FONTS.map((font) => (
                <option key={font.id} value={font.id}>
                  {font.name} — {font.designer}
                </option>
              ))}
            </select>
          </Field>
        )}
      </section>

      <section className="space-y-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          Layers
        </div>
        {clicker && params.clickerPrintHousing && (
          <LayerCard
            id="housing"
            title="Housing"
            hint="MX / 1u switch case"
            params={params}
            onLayer={onLayer}
            onColor={onColor}
          />
        )}
        {(!clicker || params.clickerPrintKeycap) && (
          <>
            <LayerCard
              id="outer"
              title={
                monogram
                  ? "Letter stand"
                  : nameplate
                    ? "Desk plate"
                    : clicker
                      ? "Keycap"
                      : "Outer outline"
              }
              hint={
                monogram
                  ? "Big letter body and desk foot"
                  : nameplate
                    ? "Solid base that sits on the desk"
                    : clicker
                      ? "Cap body that mounts on the +"
                      : "Base plate + ring hole"
              }
              params={params}
              onLayer={onLayer}
              onColor={onColor}
            />
            <LayerCard
              id="outline"
              title={
                monogram
                  ? "Letter rim"
                  : nameplate
                    ? "Plate frame"
                    : clicker
                      ? "Cap outline"
                      : "Inner outline"
              }
              hint={
                monogram
                  ? "Raised border on the letter face"
                  : clicker
                    ? "Raised frame on the cap"
                    : "Raised frame around the name"
              }
              params={params}
              onLayer={onLayer}
              onColor={onColor}
            />
            <LayerCard
              id="name"
              title={
                monogram
                  ? "Script"
                  : clicker
                    ? params.clickerCapArt === "svg" || params.name.toLowerCase().includes("{svg}")
                      ? "Letter / design"
                      : "Letter"
                    : "Name"
              }
              hint={monogram ? "Small writing across the face" : "Raised lettering"}
              params={params}
              onLayer={onLayer}
              onColor={onColor}
            />
          </>
        )}
      </section>

      {clicker && (
        <section className="space-y-3">
          <Field label="Switch">
            <ChipRow
              value={params.switchStandard}
              options={SWITCHES}
              onChange={(switchStandard) => onChange({ switchStandard })}
            />
            <p className="text-[11px] leading-relaxed text-muted">
              MX fits Cherry / Gateron / Kailh MX. 1u keyboard uses a 19.05 mm cap and a matching case.
            </p>
          </Field>
          {!clickerV2 && (
            <Field label="Layout">
              <ChipRow
                value={params.clickerLayout ?? "connected"}
                options={LAYOUTS}
                onChange={(clickerLayout) =>
                  onChange({
                    clickerLayout,
                    ...(clickerLayout === "connected" && params.ringPosition === "none"
                      ? { ringPosition: "left" as const }
                      : {}),
                  })
                }
              />
              <p className="text-[11px] leading-relaxed text-muted">
                {params.clickerLayout === "connected"
                  ? "Left key ring, then letter wells in a row with a joining bar at the bottom so they read as one name."
                  : "Each letter is its own housing and cap, packed separately on the bed."}
              </p>
            </Field>
          )}
          {clickerV2 && (
            <p className="rounded-lg border border-line bg-ink/40 px-3 py-2 text-[11px] leading-relaxed text-muted">
              Clicker v2 always uses a linked name-bar housing with the ring on the left.
            </p>
          )}
          <label className="flex items-center justify-between gap-3 rounded-lg border border-line bg-ink/40 px-3 py-2">
            <div>
              <div className="text-sm">Print housing</div>
              <div className="text-[11px] text-muted">
                {connected ? "Name bar the switches snap into" : "Case the switch snaps into"}
              </div>
            </div>
            <input
              type="checkbox"
              checked={params.clickerPrintHousing}
              onChange={(e) => onChange({ clickerPrintHousing: e.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-line bg-ink/40 px-3 py-2">
            <div>
              <div className="text-sm">Print keycap</div>
              <div className="text-[11px] text-muted">Custom top with MX + mount</div>
            </div>
            <input
              type="checkbox"
              checked={params.clickerPrintKeycap}
              onChange={(e) => onChange({ clickerPrintKeycap: e.target.checked })}
            />
          </label>
          {params.clickerPrintKeycap && (
            <Field label="Cap design">
              <ChipRow
                value={params.clickerCapArt ?? "letter"}
                options={CAP_ART}
                onChange={(clickerCapArt) => onChange({ clickerCapArt })}
              />
              <div className="mt-2 space-y-2">
                <label className="flex cursor-pointer flex-col gap-1 rounded-lg border border-dashed border-line bg-ink/40 px-3 py-3 text-center hover:border-accent/50">
                  <span className="text-sm text-fog">
                    {params.clickerSvgName ? params.clickerSvgName : "Choose an .svg file"}
                  </span>
                  <span className="text-[11px] text-muted">Flat vector paths work best</span>
                  <input
                    type="file"
                    accept=".svg,image/svg+xml"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      const clickerSvg = await file.text();
                      onChange({
                        clickerSvg,
                        clickerSvgName: file.name,
                      });
                    }}
                  />
                </label>
                {params.clickerSvg ? (
                  <button
                    type="button"
                    className="text-[11px] text-muted underline hover:text-fog"
                    onClick={() => onChange({ clickerSvg: "", clickerSvgName: "" })}
                  >
                    Clear SVG
                  </button>
                ) : null}
                <p className="text-[11px] leading-relaxed text-muted">
                  {params.clickerCapArt === "svg"
                    ? "Every keycap gets this SVG. For a mixed name bar, switch to Letters + {svg} and type Michael {svg} Corpuz."
                    : "Default: each letter is its own cap. Put {svg} in the name to add one icon cap in that spot — letters and SVG print together on the same bar."}
                </p>
              </div>
            </Field>
          )}
          {params.switchStandard === "mx" && (
            <Field label="Keycap size" value={`${params.clickerKeycapMm.toFixed(1)} mm`}>
              <input
                type="range"
                min={16}
                max={22}
                step={0.1}
                value={params.clickerKeycapMm}
                onChange={(e) => onChange({ clickerKeycapMm: Number(e.target.value) })}
              />
            </Field>
          )}
          <Field label="Keycap height" value={`${params.clickerKeycapHeightMm.toFixed(1)} mm`}>
            <input
              type="range"
              min={6}
              max={12}
              step={0.1}
              value={params.clickerKeycapHeightMm}
              onChange={(e) => onChange({ clickerKeycapHeightMm: Number(e.target.value) })}
            />
          </Field>
          <Field label="Stem clearance" value={`${params.clickerStemClearanceMm.toFixed(2)} mm`}>
            <input
              type="range"
              min={0.08}
              max={0.35}
              step={0.01}
              value={params.clickerStemClearanceMm}
              onChange={(e) => onChange({ clickerStemClearanceMm: Number(e.target.value) })}
            />
          </Field>
          <Field label="Switch pocket clearance" value={`${params.clickerSwitchClearanceMm.toFixed(2)} mm`}>
            <input
              type="range"
              min={0.15}
              max={0.7}
              step={0.05}
              value={params.clickerSwitchClearanceMm}
              onChange={(e) => onChange({ clickerSwitchClearanceMm: Number(e.target.value) })}
            />
          </Field>
          <Field label="Plate hole extra" value={`${params.clickerPlateClearanceMm.toFixed(2)} mm`}>
            <input
              type="range"
              min={0.05}
              max={0.45}
              step={0.05}
              value={params.clickerPlateClearanceMm}
              onChange={(e) => onChange({ clickerPlateClearanceMm: Number(e.target.value) })}
            />
          </Field>
          <Field label="Housing wall" value={`${params.clickerWallMm.toFixed(1)} mm`}>
            <input
              type="range"
              min={1.6}
              max={4}
              step={0.1}
              value={params.clickerWallMm}
              onChange={(e) => onChange({ clickerWallMm: Number(e.target.value) })}
            />
          </Field>
          <Field label="Well depth" value={`${params.clickerWellMm.toFixed(1)} mm`}>
            <input
              type="range"
              min={6.5}
              max={12}
              step={0.1}
              value={params.clickerWellMm}
              onChange={(e) => onChange({ clickerWellMm: Number(e.target.value) })}
            />
          </Field>
          {connected && (
            <>
              <Field label="Join bar" value={`${(params.clickerJoinMm ?? 7.2).toFixed(1)} mm`}>
                <input
                  type="range"
                  min={4}
                  max={12}
                  step={0.1}
                  value={params.clickerJoinMm ?? 7.2}
                  onChange={(e) => onChange({ clickerJoinMm: Number(e.target.value) })}
                />
              </Field>
              <Field label="Letter gap" value={`${(params.clickerLetterGapMm ?? 1.6).toFixed(1)} mm`}>
                <input
                  type="range"
                  min={0}
                  max={4}
                  step={0.1}
                  value={params.clickerLetterGapMm ?? 1.6}
                  onChange={(e) => onChange({ clickerLetterGapMm: Number(e.target.value) })}
                />
              </Field>
            </>
          )}
          <label className="flex items-center justify-between gap-3 rounded-lg border border-line bg-ink/40 px-3 py-2">
            <div>
              <div className="text-sm">Eject hole</div>
              <div className="text-[11px] text-muted">Push the switch out from below</div>
            </div>
            <input
              type="checkbox"
              checked={params.clickerEjectHole}
              onChange={(e) => onChange({ clickerEjectHole: e.target.checked })}
            />
          </label>
          <p className="text-[11px] leading-relaxed text-muted">
            Print the keycap with the letter facing up. The MX + socket is open on the bed. Caps sit
            under their wells so you can match each letter. If a cap is tight on the stem, add 0.04 mm
            clearance and reprint.
          </p>
        </section>
      )}

      {!clicker && !monogram && (
        <section className="space-y-4">
          <Field
            label={nameplate ? "Plate length" : "Length"}
            value={`${params.lengthMm.toFixed(1)} mm`}
          >
            <input
              type="range"
              min={nameplate ? 60 : 28}
              max={nameplate ? 220 : 160}
              step={0.5}
              value={params.lengthMm}
              onChange={(e) => onChange({ lengthMm: Number(e.target.value) })}
            />
          </Field>
          <Field label="Total thickness" value={`${params.totalThicknessMm.toFixed(2)} mm`}>
            <input
              type="range"
              min={nameplate ? 2.4 : 1.6}
              max={nameplate ? 10 : 8}
              step={0.1}
              value={params.totalThicknessMm}
              onChange={(e) => onChange({ totalThicknessMm: Number(e.target.value) })}
            />
          </Field>
          <Field label="Name raise" value={`${params.nameRaiseMm.toFixed(2)} mm`}>
            <input
              type="range"
              min={0.2}
              max={2.4}
              step={0.05}
              value={params.nameRaiseMm}
              onChange={(e) => onChange({ nameRaiseMm: Number(e.target.value) })}
            />
          </Field>
          <Field label="Outline raise" value={`${params.outlineRaiseMm.toFixed(2)} mm`}>
            <input
              type="range"
              min={0.2}
              max={2.4}
              step={0.05}
              value={params.outlineRaiseMm}
              onChange={(e) => onChange({ outlineRaiseMm: Number(e.target.value) })}
            />
          </Field>
          <p className="text-[11px] leading-relaxed text-muted">
            {nameplate
              ? "Thicker base for desk use. Length sets how wide the plate reads; height follows the name."
              : "Base plate uses the leftover thickness so the finished part matches the total. Height scales with the name so the plate stays proportionate."}
          </p>
        </section>
      )}

      {monogram && (
        <section className="space-y-4">
          <Field label="Letter height" value={`${params.lengthMm.toFixed(0)} mm`}>
            <input
              type="range"
              min={40}
              max={160}
              step={1}
              value={params.lengthMm}
              onChange={(e) => onChange({ lengthMm: Number(e.target.value) })}
            />
          </Field>
          <Field label="Letter depth" value={`${params.totalThicknessMm.toFixed(1)} mm`}>
            <input
              type="range"
              min={8}
              max={28}
              step={0.5}
              value={params.totalThicknessMm}
              onChange={(e) => onChange({ totalThicknessMm: Number(e.target.value) })}
            />
          </Field>
          <Field label="Stand height" value={`${params.monogramStandMm.toFixed(1)} mm`}>
            <input
              type="range"
              min={4}
              max={20}
              step={0.5}
              value={params.monogramStandMm}
              onChange={(e) => onChange({ monogramStandMm: Number(e.target.value) })}
            />
          </Field>
          <Field label="Script angle" value={`${params.monogramScriptAngleDeg.toFixed(0)}°`}>
            <input
              type="range"
              min={0}
              max={35}
              step={1}
              value={params.monogramScriptAngleDeg}
              onChange={(e) => onChange({ monogramScriptAngleDeg: Number(e.target.value) })}
            />
          </Field>
          <p className="text-[11px] leading-relaxed text-muted">
            Tilts the writing from the lower left toward the upper right across the letter.
          </p>
          <Field label="Script raise" value={`${params.nameRaiseMm.toFixed(2)} mm`}>
            <input
              type="range"
              min={0.4}
              max={3.2}
              step={0.05}
              value={params.nameRaiseMm}
              onChange={(e) => onChange({ nameRaiseMm: Number(e.target.value) })}
            />
          </Field>
          <Field label="Rim raise" value={`${params.outlineRaiseMm.toFixed(2)} mm`}>
            <input
              type="range"
              min={0.2}
              max={2.4}
              step={0.05}
              value={params.outlineRaiseMm}
              onChange={(e) => onChange({ outlineRaiseMm: Number(e.target.value) })}
            />
          </Field>
          <p className="text-[11px] leading-relaxed text-muted">
            Big letter sits on a desk foot. Script and rim print on the front face for multi-color AMS.
          </p>
        </section>
      )}

      {clicker && (
        <section className="space-y-4">
          <Field label="Letter raise" value={`${params.nameRaiseMm.toFixed(2)} mm`}>
            <input
              type="range"
              min={0.2}
              max={2.4}
              step={0.05}
              value={params.nameRaiseMm}
              onChange={(e) => onChange({ nameRaiseMm: Number(e.target.value) })}
            />
          </Field>
          <Field label="Outline raise" value={`${params.outlineRaiseMm.toFixed(2)} mm`}>
            <input
              type="range"
              min={0.2}
              max={2.4}
              step={0.05}
              value={params.outlineRaiseMm}
              onChange={(e) => onChange({ outlineRaiseMm: Number(e.target.value) })}
            />
          </Field>
          <Field label="Keycap corner" value={`${params.clickerKeycapRadiusMm.toFixed(1)} mm`}>
            <input
              type="range"
              min={0.4}
              max={6}
              step={0.1}
              value={params.clickerKeycapRadiusMm}
              onChange={(e) => onChange({ clickerKeycapRadiusMm: Number(e.target.value) })}
            />
          </Field>
          <Field label="Housing corner" value={`${params.cornerRadiusMm.toFixed(1)} mm`}>
            <input
              type="range"
              min={0.4}
              max={6}
              step={0.1}
              value={params.cornerRadiusMm}
              onChange={(e) => onChange({ cornerRadiusMm: Number(e.target.value) })}
            />
          </Field>
          <Field label="Housing floor" value={`${params.clickerFloorMm.toFixed(1)} mm`}>
            <input
              type="range"
              min={1.2}
              max={3.2}
              step={0.1}
              value={params.clickerFloorMm}
              onChange={(e) => onChange({ clickerFloorMm: Number(e.target.value) })}
            />
          </Field>
          <Field label="Plate thickness" value={`${params.clickerPlateMm.toFixed(1)} mm`}>
            <input
              type="range"
              min={1.2}
              max={2.4}
              step={0.1}
              value={params.clickerPlateMm}
              onChange={(e) => onChange({ clickerPlateMm: Number(e.target.value) })}
            />
          </Field>
        </section>
      )}

      {!clicker && !monogram && !nameplate && (
      <section className="space-y-3">
        <Field label="Keychain type">
          <ChipRow
            value={params.keychainType}
            options={TYPES}
            onChange={(keychainType) => onChange({ keychainType })}
          />
          {params.keychainType === "cloud" && (
            <p className="text-[11px] leading-relaxed text-muted">
              Backing and outline puff around the letter shapes, rounded like a cloud.
            </p>
          )}
        </Field>
        {params.keychainType === "plate" && (
          <Field label="Plate shape">
            <ChipRow
              value={params.shape}
              options={SHAPES}
              onChange={(shape) => onChange({ shape })}
            />
          </Field>
        )}
      </section>
      )}

      {nameplate && (
        <section className="space-y-3">
          <Field label="Plate shape">
            <ChipRow
              value={params.shape}
              options={SHAPES.filter((s) => s.id !== "circle" && s.id !== "tag")}
              onChange={(shape) => onChange({ shape })}
            />
          </Field>
          <p className="text-[11px] leading-relaxed text-muted">
            Desk name plates print flat with no key ring. Rounded or pill works best for office use.
          </p>
        </section>
      )}

      {!monogram && !nameplate && (
      <section className="space-y-3">
        <Field label={clicker ? "Housing ring" : "Ring placement"}>
          <ChipRow
            value={params.ringPosition}
            options={
              connected
                ? RINGS.filter((ring) => ring.id === "left" || ring.id === "none" || ring.id === "right")
                : RINGS
            }
            onChange={(ringPosition) => onChange({ ringPosition })}
          />
          {clicker && (
            <p className="text-[11px] leading-relaxed text-muted">
              {connected
                ? "The trend is a split-ring tab on the left letter. Choose None to skip it."
                : "Optional split-ring tab on the housing. Choose None for a desk fidget."}
            </p>
          )}
        </Field>
        <Field label="Ring hole" value={`${params.ringDiameterMm.toFixed(1)} mm`}>
          <input
            type="range"
            min={3}
            max={8}
            step={0.1}
            value={params.ringDiameterMm}
            onChange={(e) => onChange({ ringDiameterMm: Number(e.target.value) })}
          />
        </Field>
        <Field label="Ring edge margin" value={`${params.ringMarginMm.toFixed(1)} mm`}>
          <input
            type="range"
            min={1.6}
            max={6}
            step={0.1}
            value={params.ringMarginMm}
            onChange={(e) => onChange({ ringMarginMm: Number(e.target.value) })}
          />
        </Field>
      </section>
      )}

      <section className="space-y-4">
        {!clicker && !monogram && (nameplate || params.keychainType === "plate") && (
          <Field label="Corner radius" value={`${params.cornerRadiusMm.toFixed(1)} mm`}>
            <input
              type="range"
              min={0.4}
              max={12}
              step={0.1}
              value={params.cornerRadiusMm}
              onChange={(e) => onChange({ cornerRadiusMm: Number(e.target.value) })}
            />
          </Field>
        )}
        {!monogram && (
          <Field
            label={
              clicker
                ? "Letter padding"
                : nameplate
                  ? "Text padding"
                  : params.keychainType === "cloud"
                    ? "Cloud puff"
                    : "Text padding"
            }
            value={`${params.platePaddingMm.toFixed(1)} mm`}
          >
            <input
              type="range"
              min={1.2}
              max={10}
              step={0.1}
              value={params.platePaddingMm}
              onChange={(e) => onChange({ platePaddingMm: Number(e.target.value) })}
            />
          </Field>
        )}
        <Field
          label={monogram ? "Rim width" : "Outline width"}
          value={`${params.outlineWidthMm.toFixed(1)} mm`}
        >
          <input
            type="range"
            min={0.8}
            max={5}
            step={0.1}
            value={params.outlineWidthMm}
            onChange={(e) => onChange({ outlineWidthMm: Number(e.target.value) })}
          />
        </Field>
        <Field label="Bed spacing" value={`${params.bedGapMm.toFixed(1)} mm`}>
          <input
            type="range"
            min={2}
            max={12}
            step={0.5}
            value={params.bedGapMm}
            onChange={(e) => onChange({ bedGapMm: Number(e.target.value) })}
          />
        </Field>
        <Field
          label={monogram ? "Script spacing" : "Letter spacing"}
          value={`${params.letterSpacing.toFixed(1)}`}
        >
          <input
            type="range"
            min={-4}
            max={18}
            step={0.5}
            value={params.letterSpacing}
            onChange={(e) => onChange({ letterSpacing: Number(e.target.value) })}
          />
        </Field>
        <Field label="Curve quality" value={`${params.curveSegments}`}>
          <input
            type="range"
            min={8}
            max={28}
            step={1}
            value={params.curveSegments}
            onChange={(e) => onChange({ curveSegments: Number(e.target.value) })}
          />
        </Field>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-line bg-ink/40 px-3 py-2">
          <div>
            <div className="text-sm">Edge bevel</div>
            <div className="text-[11px] text-muted">Softer printed edges</div>
          </div>
          <input
            type="checkbox"
            checked={params.bevelEnabled}
            onChange={(e) => onChange({ bevelEnabled: e.target.checked })}
          />
        </label>
        {params.bevelEnabled && (
          <Field label="Bevel size" value={`${params.bevelSizeMm.toFixed(2)} mm`}>
            <input
              type="range"
              min={0.05}
              max={0.4}
              step={0.01}
              value={params.bevelSizeMm}
              onChange={(e) => onChange({ bevelSizeMm: Number(e.target.value) })}
            />
          </Field>
        )}
      </section>
    </div>
  );
}
