import { isClickerV2 } from "../../types";
import {
  CAP_ART,
  ChipRow,
  Field,
  FontSelectField,
  LayerCard,
  LAYOUTS,
  NameField,
  PanelHint,
  PanelShell,
  QualityFields,
  RingFields,
  RINGS,
  SWITCHES,
  TextCaseField,
  type PanelProps,
} from "./shared";

export function ClickerControls({ params, onChange, onColor, onLayer }: PanelProps) {
  const clickerV2 = isClickerV2(params.productType);
  const connected = clickerV2 || params.clickerLayout === "connected";

  return (
    <PanelShell>
      <PanelHint>
        {clickerV2
          ? "Linked name-bar clicker with a left ring. Comma-separate names to print a set."
          : params.clickerLayout === "connected"
            ? "Ring on the left, letters join along the bottom. Caps use a traditional tapered top (narrower at the face). Comma-separate names to print a set."
            : "Design a switch housing and a custom MX keycap with a traditional tapered top. Comma-separate letters to fill a 256 × 256 mm bed."}
      </PanelHint>

      <section className="space-y-3">
        <NameField
          params={params}
          onChange={onChange}
          label={connected ? "Names" : "Letters"}
          placeholder={connected ? "Michael {svg} Corpuz" : "M, A, S"}
          help={
            clickerV2
              ? "Linked name-bar: each letter is a well, and {svg} becomes its own icon well in the row. Commas print more than one name."
              : connected
                ? "Type a name. Put {svg} where the icon should sit (e.g. Michael {svg} Corpuz). Commas print more than one name."
                : "One letter per clicker works best. Separate with commas to print a set."
          }
        />
        <TextCaseField params={params} onChange={onChange} />
        <FontSelectField params={params} onChange={onChange} />
      </section>

      <section className="space-y-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Layers</div>
        {params.clickerPrintHousing && (
          <LayerCard
            id="housing"
            title="Housing"
            hint="MX / 1u switch case"
            params={params}
            onLayer={onLayer}
            onColor={onColor}
          />
        )}
        {params.clickerPrintKeycap && (
          <>
            <LayerCard
              id="outer"
              title="Keycap"
              hint="Cap body that mounts on the +"
              params={params}
              onLayer={onLayer}
              onColor={onColor}
            />
            <LayerCard
              id="outline"
              title="Cap outline"
              hint="Raised frame on the cap"
              params={params}
              onLayer={onLayer}
              onColor={onColor}
            />
            <LayerCard
              id="name"
              title={
                params.clickerCapArt === "svg" || params.name.toLowerCase().includes("{svg}")
                  ? "Letter / design"
                  : "Letter"
              }
              hint="Raised lettering"
              params={params}
              onLayer={onLayer}
              onColor={onColor}
            />
          </>
        )}
      </section>

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
          Print the keycap with the letter facing up. The MX + socket is open on the bed. Caps sit under
          their wells so you can match each letter. If a cap is tight on the stem, add 0.04 mm clearance
          and reprint.
        </p>
      </section>

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

      <RingFields
        params={params}
        onChange={onChange}
        label="Housing ring"
        options={
          connected
            ? RINGS.filter((ring) => ring.id === "left" || ring.id === "none" || ring.id === "right")
            : RINGS
        }
        help={
          connected
            ? "The trend is a split-ring tab on the left letter. Choose None to skip it."
            : "Optional split-ring tab on the housing. Choose None for a desk fidget."
        }
      />

      <QualityFields
        params={params}
        onChange={onChange}
        paddingLabel="Letter padding"
        showCorner={false}
      />
    </PanelShell>
  );
}
