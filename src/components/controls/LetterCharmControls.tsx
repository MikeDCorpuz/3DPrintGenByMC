import {
  Field,
  FontSelectField,
  LayerCard,
  NameField,
  PanelHint,
  PanelShell,
  TextCaseField,
  type PanelProps,
} from "./shared";
import { useEffect } from "react";

export function LetterCharmControls({ params, onChange, onColor, onLayer }: PanelProps) {
  useEffect(() => {
    if (params.letterSpacing <= 1) onChange({ letterSpacing: 16 });
    // Only lift the old cramped default. A later slider change should stick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <PanelShell>
      <PanelHint>
        One comic letter is the charm — no plate, no chain. A clasp hole punches the top, and the
        full name is cut into the longest thick stroke — a stem or bar, not the middle of the letter.
      </PanelHint>

      <section className="space-y-3">
        <NameField
          params={params}
          onChange={onChange}
          label="Names"
          placeholder="PORSHA, SAGE, NINA"
          help="The first letter becomes the big charm. The whole name is engraved into it. Commas print more than one."
          showSvgInsert={false}
        />
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
            Leave blank to use the first letter of each name. A bold display face prints the charm thickest.
          </p>
        </Field>
        <TextCaseField params={params} onChange={onChange} />
        <FontSelectField params={params} onChange={onChange} label="Big letter font" letterOnly />
        <FontSelectField
          params={params}
          onChange={onChange}
          label="Small text font"
          fontKey="scriptFontId"
        />
      </section>

      <section className="space-y-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Color</div>
        <LayerCard
          id="outer"
          title="Letter"
          hint="Solid charm — one color. The name is a recess, not a second filament."
          params={params}
          onLayer={onLayer}
          onColor={onColor}
        />
      </section>

      <section className="space-y-4">
        <Field label="Letter height" value={`${params.lengthMm.toFixed(0)} mm`}>
          <input
            type="range"
            min={36}
            max={90}
            step={1}
            value={params.lengthMm}
            onChange={(e) => onChange({ lengthMm: Number(e.target.value) })}
          />
        </Field>
        <Field label="Thickness" value={`${params.totalThicknessMm.toFixed(1)} mm`}>
          <input
            type="range"
            min={2.4}
            max={5}
            step={0.1}
            value={params.totalThicknessMm}
            onChange={(e) => onChange({ totalThicknessMm: Number(e.target.value) })}
          />
        </Field>
        <Field label="Engrave depth" value={`${params.nameRaiseMm.toFixed(2)} mm`}>
          <input
            type="range"
            min={0.4}
            max={1.2}
            step={0.05}
            value={params.nameRaiseMm}
            onChange={(e) => onChange({ nameRaiseMm: Number(e.target.value) })}
          />
        </Field>
        <Field label="Clasp hole" value={`${params.ringDiameterMm.toFixed(1)} mm`}>
          <input
            type="range"
            min={3}
            max={5.5}
            step={0.1}
            value={params.ringDiameterMm}
            onChange={(e) => onChange({ ringDiameterMm: Number(e.target.value) })}
          />
        </Field>
        <Field label="Name spacing" value={`${params.letterSpacing.toFixed(1)}`}>
          <input
            type="range"
            min={-4}
            max={32}
            step={0.5}
            value={params.letterSpacing}
            onChange={(e) => onChange({ letterSpacing: Number(e.target.value) })}
          />
        </Field>
        <p className="text-[11px] leading-relaxed text-muted">
          Print face-up. The hole goes all the way through; the name is only a shallow pocket on the
          top so it needs no supports.
        </p>
      </section>
    </PanelShell>
  );
}
