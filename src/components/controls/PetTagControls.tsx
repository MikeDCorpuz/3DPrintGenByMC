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
  type PanelProps,
} from "./shared";

export function PetTagControls({ params, onChange, onColor, onLayer }: PanelProps) {
  return (
    <PanelShell>
      <PanelHint>
        Collar pet tag with a top ring hole and raised name. Use {"{svg}"} for a paw or heart.
        Comma-separate names to print a set.
      </PanelHint>

      <section className="space-y-3">
        <NameField
          params={params}
          onChange={onChange}
          label="Names"
          placeholder="MICHAEL, MAX {svg}"
          help="Collar tag with a top ring hole. Put {svg} in the name for a paw / heart icon. Commas print more than one tag."
        />
        <SvgUploadField
          params={params}
          onChange={onChange}
          hint="Paw, bone, or heart — used wherever you type {svg}"
        />
        <TextCaseField params={params} onChange={onChange} />
        <FontSelectField params={params} onChange={onChange} />
      </section>

      <section className="space-y-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Layers</div>
        <LayerCard
          id="outer"
          title="Pet tag"
          hint="Tag body with collar ring hole"
          params={params}
          onLayer={onLayer}
          onColor={onColor}
        />
        <LayerCard
          id="outline"
          title="Tag rim"
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
        <Field label="Tag length" value={`${params.lengthMm.toFixed(1)} mm`}>
          <input
            type="range"
            min={28}
            max={90}
            step={0.5}
            value={params.lengthMm}
            onChange={(e) => onChange({ lengthMm: Number(e.target.value) })}
          />
        </Field>
        <Field label="Total thickness" value={`${params.totalThicknessMm.toFixed(2)} mm`}>
          <input
            type="range"
            min={1.6}
            max={6}
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
          A bit thicker than a keychain so the collar tag stays sturdy. Top ring is for the split ring.
        </p>
      </section>

      <section className="space-y-3">
        <Field label="Tag shape">
          <ChipRow
            value={params.shape}
            options={SHAPES.filter((s) => s.id !== "hexagon")}
            onChange={(shape) => onChange({ shape })}
          />
        </Field>
        <p className="text-[11px] leading-relaxed text-muted">
          Tag silhouette is the classic collar look. Circle and pill also work well for pets.
        </p>
      </section>

      <RingFields
        params={params}
        onChange={onChange}
        help="The tip gets a solid circular eyelet with the ring hole — full thickness from the bed, no floating overhang. Size the hole for your split ring (often 4–5 mm)."
      />

      <QualityFields params={params} onChange={onChange} showCorner paddingLabel="Text padding" />
    </PanelShell>
  );
}
