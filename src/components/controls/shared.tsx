import type { ReactNode } from "react";
import { FONTS } from "../../lib/fonts";
import {
  PRESET_COLORS,
  type ClickerCapArt,
  type ClickerLayout,
  type KeychainParams,
  type KeychainType,
  type LayerId,
  type PlateShape,
  type RingPosition,
  type SwitchStandard,
  type TextCase,
} from "../../types";

export interface PanelProps {
  params: KeychainParams;
  onChange: (patch: Partial<KeychainParams>) => void;
  onColor: (layer: LayerId, hex: string) => void;
  onLayer: (layer: LayerId, on: boolean) => void;
}

export const SCRIPT_FONTS = FONTS.filter((font) => font.style === "script");
export const LETTER_FONTS = FONTS.filter(
  (font) => font.style === "serif" || font.style === "display" || font.style === "sans",
);

export const LAYOUTS: { id: ClickerLayout; label: string }[] = [
  { id: "connected", label: "Name bar" },
  { id: "separate", label: "Separate" },
];

export const CAP_ART: { id: ClickerCapArt; label: string }[] = [
  { id: "letter", label: "Letters + {svg}" },
  { id: "svg", label: "SVG on every cap" },
];

export const SWITCHES: { id: SwitchStandard; label: string }[] = [
  { id: "mx", label: "MX switch" },
  { id: "standard-1u", label: "1u keyboard" },
];

export const TYPES: { id: KeychainType; label: string }[] = [
  { id: "plate", label: "Plate" },
  { id: "cloud", label: "Text cloud" },
];

export const SHAPES: { id: PlateShape; label: string }[] = [
  { id: "rounded-rect", label: "Rounded" },
  { id: "pill", label: "Pill" },
  { id: "tag", label: "Tag" },
  { id: "hexagon", label: "Hex" },
  { id: "circle", label: "Circle" },
];

export const RINGS: { id: RingPosition; label: string }[] = [
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
  { id: "top", label: "Top" },
  { id: "bottom", label: "Bottom" },
  { id: "none", label: "None" },
];

export const CASES: { id: TextCase; label: string }[] = [
  { id: "as-is", label: "As typed" },
  { id: "upper", label: "UPPER" },
  { id: "title", label: "Title" },
  { id: "lower", label: "lower" },
];

export function Field({
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

export function ChipRow<T extends string>({
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

export function LayerCard({
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
    <div
      className={`rounded-xl border p-3 ${on ? "border-line bg-ink/50" : "border-line/70 bg-ink/20 opacity-70"}`}
    >
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
        <input type="color" value={params.colors[id]} onChange={(e) => onColor(id, e.target.value)} />
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

export function PanelHint({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-line bg-ink/40 px-3 py-2 text-[11px] leading-relaxed text-muted">
      {children}
    </p>
  );
}

export function NameField({
  params,
  onChange,
  label,
  placeholder,
  help,
  showSvgInsert = true,
}: {
  params: KeychainParams;
  onChange: (patch: Partial<KeychainParams>) => void;
  label: string;
  placeholder: string;
  help: string;
  showSvgInsert?: boolean;
}) {
  const count = params.name.split(",").filter((part) => part.trim()).length || 1;
  return (
    <Field label={label} value={`${count} on bed`}>
      <textarea
        value={params.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder={placeholder}
        rows={4}
        className="w-full resize-y rounded-lg border border-line bg-ink px-3 py-2.5 text-base leading-relaxed outline-none ring-accent/40 focus:ring-2"
      />
      {showSvgInsert && (
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
            <span className="text-[11px] text-muted">
              Upload an SVG below, then place {"{svg}"} in the name
            </span>
          )}
        </div>
      )}
      <p className="text-[11px] leading-relaxed text-muted">{help}</p>
    </Field>
  );
}

export function SvgUploadField({
  params,
  onChange,
  hint,
}: {
  params: KeychainParams;
  onChange: (patch: Partial<KeychainParams>) => void;
  hint: string;
}) {
  return (
    <Field label="Inline SVG">
      <label className="flex cursor-pointer flex-col gap-1 rounded-lg border border-dashed border-line bg-ink/40 px-3 py-3 text-center hover:border-accent/50">
        <span className="text-sm text-fog">
          {params.clickerSvgName ? params.clickerSvgName : "Choose an .svg file"}
        </span>
        <span className="text-[11px] text-muted">{hint}</span>
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
  );
}

export function TextCaseField({
  params,
  onChange,
}: {
  params: KeychainParams;
  onChange: (patch: Partial<KeychainParams>) => void;
}) {
  return (
    <Field label="Text case">
      <ChipRow value={params.textCase} options={CASES} onChange={(textCase) => onChange({ textCase })} />
    </Field>
  );
}

export function FontSelectField({
  params,
  onChange,
  label = "Font",
  letterOnly = false,
}: {
  params: KeychainParams;
  onChange: (patch: Partial<KeychainParams>) => void;
  label?: string;
  letterOnly?: boolean;
}) {
  const styles = letterOnly
    ? (["serif", "display", "sans"] as const)
    : (["sans", "serif", "display", "script", "mono"] as const);
  return (
    <Field label={label}>
      <select
        value={params.fontId}
        onChange={(e) => onChange({ fontId: e.target.value })}
        className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none ring-accent/40 focus:ring-2"
      >
        {styles.map((style) => (
          <optgroup key={style} label={style.toUpperCase()}>
            {(letterOnly ? LETTER_FONTS : FONTS)
              .filter((f) => f.style === style)
              .map((font) => (
                <option key={font.id} value={font.id}>
                  {font.name} — {font.designer}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </Field>
  );
}

export function QualityFields({
  params,
  onChange,
  outlineLabel = "Outline width",
  spacingLabel = "Letter spacing",
  showPadding = true,
  paddingLabel = "Text padding",
  showCorner = false,
}: {
  params: KeychainParams;
  onChange: (patch: Partial<KeychainParams>) => void;
  outlineLabel?: string;
  spacingLabel?: string;
  showPadding?: boolean;
  paddingLabel?: string;
  showCorner?: boolean;
}) {
  return (
    <section className="space-y-4">
      {showCorner && (
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
      {showPadding && (
        <Field label={paddingLabel} value={`${params.platePaddingMm.toFixed(1)} mm`}>
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
      <Field label={outlineLabel} value={`${params.outlineWidthMm.toFixed(1)} mm`}>
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
      <Field label={spacingLabel} value={`${params.letterSpacing.toFixed(1)}`}>
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
  );
}

export function RingFields({
  params,
  onChange,
  label = "Ring placement",
  options = RINGS,
  help,
}: {
  params: KeychainParams;
  onChange: (patch: Partial<KeychainParams>) => void;
  label?: string;
  options?: { id: RingPosition; label: string }[];
  help?: string;
}) {
  return (
    <section className="space-y-3">
      <Field label={label}>
        <ChipRow
          value={params.ringPosition}
          options={options}
          onChange={(ringPosition) => onChange({ ringPosition })}
        />
        {help ? <p className="text-[11px] leading-relaxed text-muted">{help}</p> : null}
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
  );
}

export function PanelShell({ children }: { children: ReactNode }) {
  return <div className="scrollbar-thin flex h-full flex-col gap-6 overflow-y-auto p-5">{children}</div>;
}
