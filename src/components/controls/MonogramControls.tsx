import {
  Field,
  FontSelectField,
  LayerCard,
  NameField,
  PanelHint,
  PanelShell,
  QualityFields,
  SCRIPT_FONTS,
  TextCaseField,
  type PanelProps,
} from "./shared";

export function MonogramControls({ params, onChange, onColor, onLayer }: PanelProps) {
  return (
    <PanelShell>
      <PanelHint>
        One big letter with a desk stand and script writing across the face. Comma-separate names to
        print a set.
      </PanelHint>

      <section className="space-y-3">
        <NameField
          params={params}
          onChange={onChange}
          label="Script name"
          placeholder="Michael, Alex"
          help="Small writing across the big letter. Commas print more than one stand. The big letter defaults to the first letter of each name."
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
            Leave blank to use the first letter of each script name.
          </p>
        </Field>
        <TextCaseField params={params} onChange={onChange} />
        <FontSelectField
          params={params}
          onChange={onChange}
          label="Big letter font"
          letterOnly
        />
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
      </section>

      <section className="space-y-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Layers</div>
        <LayerCard
          id="outer"
          title="Letter stand"
          hint="Big letter body and desk foot"
          params={params}
          onLayer={onLayer}
          onColor={onColor}
        />
        <LayerCard
          id="outline"
          title="Letter rim"
          hint="Raised border on the letter face"
          params={params}
          onLayer={onLayer}
          onColor={onColor}
        />
        <LayerCard
          id="name"
          title="Script"
          hint="Small writing across the face"
          params={params}
          onLayer={onLayer}
          onColor={onColor}
        />
      </section>

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

      <QualityFields
        params={params}
        onChange={onChange}
        outlineLabel="Rim width"
        spacingLabel="Script spacing"
        showPadding={false}
        showCorner={false}
      />
    </PanelShell>
  );
}
