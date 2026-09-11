import {
  ChipRow,
  Field,
  FontSelectField,
  LayerCard,
  NameField,
  PanelHint,
  PanelShell,
  QualityFields,
  RingFields,
  SHAPES,
  SvgUploadField,
  TextCaseField,
  TYPES,
  type PanelProps,
} from "./shared";

export function KeychainControls({ params, onChange, onColor, onLayer }: PanelProps) {
  return (
    <PanelShell>
      <PanelHint>
        Name keychain with optional split-ring hole. Pack the 256 × 256 mm bed, then download one
        multi-body .3mf. Use {"{svg}"} to raise an icon inline with the letters.
      </PanelHint>

      <section className="space-y-3">
        <NameField
          params={params}
          onChange={onChange}
          label="Names"
          placeholder="Michael {svg} Corpuz, Alex"
          help="Separate names with commas. Use {svg} in a name to place your uploaded icon inline."
        />
        <SvgUploadField
          params={params}
          onChange={onChange}
          hint="Used wherever you type {svg} in the name"
        />
        <TextCaseField params={params} onChange={onChange} />
        <FontSelectField params={params} onChange={onChange} />
      </section>

      <section className="space-y-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Layers</div>
        <LayerCard
          id="outer"
          title="Outer outline"
          hint="Base plate + ring hole"
          params={params}
          onLayer={onLayer}
          onColor={onColor}
        />
        <LayerCard
          id="outline"
          title="Inner outline"
          hint="Raised frame around the name"
          params={params}
          onLayer={onLayer}
          onColor={onColor}
        />
        <LayerCard
          id="name"
          title="Name"
          hint="Raised lettering"
          params={params}
          onLayer={onLayer}
          onColor={onColor}
        />
      </section>

      <section className="space-y-4">
        <Field label="Length" value={`${params.lengthMm.toFixed(1)} mm`}>
          <input
            type="range"
            min={28}
            max={160}
            step={0.5}
            value={params.lengthMm}
            onChange={(e) => onChange({ lengthMm: Number(e.target.value) })}
          />
        </Field>
        <Field label="Total thickness" value={`${params.totalThicknessMm.toFixed(2)} mm`}>
          <input
            type="range"
            min={1.6}
            max={8}
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
          Base plate uses the leftover thickness so the finished part matches the total. Height scales
          with the name so the plate stays proportionate.
        </p>
      </section>

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

      <RingFields params={params} onChange={onChange} />

      <QualityFields
        params={params}
        onChange={onChange}
        showCorner={params.keychainType === "plate"}
        paddingLabel={params.keychainType === "cloud" ? "Cloud puff" : "Text padding"}
      />
    </PanelShell>
  );
}
