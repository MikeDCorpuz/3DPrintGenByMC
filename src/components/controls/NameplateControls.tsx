import {
  ChipRow,
  Field,
  FontSelectField,
  LayerCard,
  NameField,
  PanelHint,
  PanelShell,
  QualityFields,
  SHAPES,
  SvgUploadField,
  TextCaseField,
  type PanelProps,
} from "./shared";

export function NameplateControls({ params, onChange, onColor, onLayer }: PanelProps) {
  return (
    <PanelShell>
      <PanelHint>
        Long desk name plate with raised lettering — no key ring. Comma-separate names to print a set.
      </PanelHint>

      <section className="space-y-3">
        <NameField
          params={params}
          onChange={onChange}
          label="Names"
          placeholder="Michael {svg} Corpuz"
          help="Long desk plate — use Michael {svg} Corpuz to raise your icon between words. Commas print more than one plate."
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
          title="Desk plate"
          hint="Solid base that sits on the desk"
          params={params}
          onLayer={onLayer}
          onColor={onColor}
        />
        <LayerCard
          id="outline"
          title="Plate frame"
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
        <Field label="Plate length" value={`${params.lengthMm.toFixed(1)} mm`}>
          <input
            type="range"
            min={60}
            max={220}
            step={0.5}
            value={params.lengthMm}
            onChange={(e) => onChange({ lengthMm: Number(e.target.value) })}
          />
        </Field>
        <Field label="Total thickness" value={`${params.totalThicknessMm.toFixed(2)} mm`}>
          <input
            type="range"
            min={2.4}
            max={10}
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
          Thicker base for desk use. Length sets how wide the plate reads; height follows the name.
        </p>
      </section>

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

      <QualityFields params={params} onChange={onChange} showCorner paddingLabel="Text padding" />
    </PanelShell>
  );
}
