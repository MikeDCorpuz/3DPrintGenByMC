import { useEffect } from "react";
import {
  Field,
  FontSelectField,
  LayerCard,
  NameField,
  PanelHint,
  PanelShell,
  SvgUploadField,
  TextCaseField,
  type PanelProps,
} from "./shared";

export function LetterBeadControls({ params, onChange, onColor, onLayer }: PanelProps) {
  useEffect(() => {
    if (params.fontId === "titan-one") return;
    onChange({ fontId: "titan-one" });
    // Only swap the thinner default once. A later font pick should stick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <PanelShell>
      <PanelHint>
        One thick bead per letter, with a cloud backing and a left-to-right cord hole so they string
        into a word. Put {"{svg}"} in the name for an accent bead, like a flower.
      </PanelHint>

      <section className="space-y-3">
        <NameField
          params={params}
          onChange={onChange}
          label="Word"
          placeholder="JOHANNA, {svg}"
          help="Each letter is its own bead. Commas print another word. {svg} becomes a round accent bead."
          showSvgInsert
        />
        <SvgUploadField
          params={params}
          onChange={onChange}
          hint="Filled vector art. Raised on a round bead wherever {svg} sits in the word."
        />
        <TextCaseField params={params} onChange={onChange} />
        <FontSelectField params={params} onChange={onChange} label="Letter font" letterOnly />
      </section>

      <section className="space-y-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Colors</div>
        <LayerCard
          id="outer"
          title="Cloud"
          hint="Thick backing. The cord hole goes through this, left to right."
          params={params}
          onLayer={onLayer}
          onColor={onColor}
        />
        <LayerCard
          id="name"
          title="Letter"
          hint="Raised on the face. Turn off for plain cloud beads."
          params={params}
          onLayer={onLayer}
          onColor={onColor}
        />
      </section>

      <section className="space-y-4">
        <Field label="Letter height" value={`${params.lengthMm.toFixed(0)} mm`}>
          <input
            type="range"
            min={18}
            max={42}
            step={1}
            value={params.lengthMm}
            onChange={(e) => onChange({ lengthMm: Number(e.target.value) })}
          />
        </Field>
        <Field label="Bead thickness" value={`${params.totalThicknessMm.toFixed(1)} mm`}>
          <input
            type="range"
            min={8}
            max={16}
            step={0.2}
            value={params.totalThicknessMm}
            onChange={(e) => onChange({ totalThicknessMm: Number(e.target.value) })}
          />
        </Field>
        <Field label="Letter raise" value={`${params.nameRaiseMm.toFixed(1)} mm`}>
          <input
            type="range"
            min={0.8}
            max={3}
            step={0.1}
            value={params.nameRaiseMm}
            onChange={(e) => onChange({ nameRaiseMm: Number(e.target.value) })}
          />
        </Field>
        <Field label="Cloud puff" value={`${params.platePaddingMm.toFixed(1)} mm`}>
          <input
            type="range"
            min={1.4}
            max={5}
            step={0.1}
            value={params.platePaddingMm}
            onChange={(e) => onChange({ platePaddingMm: Number(e.target.value) })}
          />
        </Field>
        <Field label="Cord hole" value={`${params.ringDiameterMm.toFixed(1)} mm`}>
          <input
            type="range"
            min={3}
            max={6}
            step={0.1}
            value={params.ringDiameterMm}
            onChange={(e) => onChange({ ringDiameterMm: Number(e.target.value) })}
          />
        </Field>
        <p className="text-[11px] leading-relaxed text-muted">
          Print face-up. The hole is a straight round tunnel through both sides, the same size the
          whole way, so they string into a word. A small bridge may sag slightly on the top of the hole.
        </p>
      </section>
    </PanelShell>
  );
}
