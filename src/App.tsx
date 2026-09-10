import { useEffect, useMemo, useRef, useState } from "react";
import { Controls } from "./components/Controls";
import { Preview } from "./components/Preview";
import { export3mf } from "./lib/export3mf";
import { loadFont } from "./lib/fontCache";
import { buildBatch, disposeBatch } from "./lib/geometry";
import { getFont } from "./lib/fonts";
import { parseNames } from "./lib/names";
import {
  DEFAULT_PARAMS,
  type BuiltBatch,
  type KeychainParams,
  type LayerId,
} from "./types";

export default function App() {
  const [params, setParams] = useState<KeychainParams>(DEFAULT_PARAMS);
  const [batch, setBatch] = useState<BuiltBatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [explode, setExplode] = useState(0);
  const [showBed, setShowBed] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);

  const fontLabel = useMemo(() => getFont(params.fontId).name, [params.fontId]);
  const names = useMemo(
    () => parseNames(params.name, params.textCase),
    [params.name, params.textCase],
  );
  const batchRef = useRef<BuiltBatch | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);
    const handle = window.setTimeout(async () => {
      try {
        const font = await loadFont(params.fontId);
        if (cancelled) return;
        const next = buildBatch(font, params);
        if (cancelled) {
          disposeBatch(next);
          return;
        }
        const previous = batchRef.current;
        batchRef.current = next;
        setBatch(next);
        if (previous && previous !== next) disposeBatch(previous);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not build the models.");
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 140);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [params]);

  const patch = (partial: Partial<KeychainParams>) => {
    setParams((prev) => ({ ...prev, ...partial }));
    setExportNote(null);
  };

  const onColor = (layer: LayerId, hex: string) => {
    setParams((prev) => ({ ...prev, colors: { ...prev.colors, [layer]: hex } }));
  };

  const onLayer = (layer: LayerId, on: boolean) => {
    setParams((prev) => ({ ...prev, layers: { ...prev.layers, [layer]: on } }));
  };

  const download = async () => {
    if (!batch) return;
    setExporting(true);
    try {
      const filename = await export3mf(batch, params);
      const mapHint =
        params.productType === "clicker"
          ? "map Housing / Keycap / Outline / Letter to your AMS slots"
          : "map Outer / Outline / Name to your AMS slots";
      setExportNote(
        `Saved ${filename}. In Bambu Studio use File → Open (not geometry-only). If a color dialog appears, ${mapHint}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const noun = params.productType === "clicker" ? "clicker" : "keychain";
  const previewTitle =
    names.length === 1 ? names[0] : `${names.length} ${noun}s`;

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-[380px] shrink-0 flex-col border-r border-line bg-panel">
        <header className="border-b border-line px-5 py-4">
          <div className="text-[11px] uppercase tracking-[0.2em] text-accent">3D print studio</div>
          <h1 className="mt-1 text-xl font-semibold">Keychain Maker</h1>
          <div className="mt-0.5 text-xs text-muted">by Mike Corpuz</div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {params.productType === "clicker"
              ? params.clickerLayout === "connected"
                ? "Ring on the left, letters join along the bottom to spell the name. Comma-separate names to print a set."
                : "Design a switch housing and a custom MX keycap. Comma-separate letters to fill a 256 × 256 mm bed."
              : "Comma-separate names to fill a 256 × 256 mm bed. Preview the batch, then send one multi-body .3mf to your slicer."}
          </p>
        </header>
        <div className="min-h-0 flex-1">
          <Controls params={params} onChange={patch} onColor={onColor} onLayer={onLayer} />
        </div>
      </aside>

      <main className="relative min-w-0 flex-1">
        <Preview batch={batch} explode={explode} showBed={showBed} />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <div className="pointer-events-auto rounded-xl border border-line/80 bg-panel/85 px-3 py-2 backdrop-blur">
            <div className="font-mono text-[11px] text-muted">
              {busy ? "Building mesh…" : error ? "Build failed" : "256 × 256 mm bed"}
            </div>
            <div className="text-sm">
              {previewTitle} · {fontLabel}
            </div>
          </div>
          {batch && (
            <div className="pointer-events-auto grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl border border-line/80 bg-panel/85 px-3 py-2 font-mono text-[11px] text-paper/80 backdrop-blur">
              <span className="text-muted">Qty</span>
              <span>{batch.metrics.count}</span>
              <span className="text-muted">Used</span>
              <span>
                {batch.metrics.widthMm.toFixed(0)} × {batch.metrics.heightMm.toFixed(0)} mm
              </span>
              <span className="text-muted">T</span>
              <span>{batch.metrics.thicknessMm.toFixed(2)} mm</span>
              <span className="text-muted">PLA</span>
              <span>~{batch.metrics.gramsPla.toFixed(1)} g</span>
            </div>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
          <div className="w-64 space-y-3 rounded-xl border border-line/80 bg-panel/90 p-3 backdrop-blur">
            <label className="block">
              <div className="mb-1 flex justify-between text-[11px] uppercase tracking-wider text-muted">
                <span>Explode layers</span>
                <span className="font-mono">{Math.round(explode * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={explode}
                onChange={(e) => setExplode(Number(e.target.value))}
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Show 256 mm bed</span>
              <input
                type="checkbox"
                checked={showBed}
                onChange={(e) => setShowBed(e.target.checked)}
              />
            </label>
          </div>

          <div className="max-w-md space-y-2">
            {batch?.overflow.length ? (
              <div className="rounded-xl border border-amber-400/40 bg-amber-950/70 px-3 py-2 text-sm text-amber-100">
                {batch.overflow.length} {noun}
                {batch.overflow.length === 1 ? "" : "s"} did not fit:
                {" "}
                {batch.overflow.join(", ")}. Reduce spacing
                {params.productType === "keychain" ? " or length" : ""}.
              </div>
            ) : null}
            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-950/70 px-3 py-2 text-sm text-red-100">
                {error}
              </div>
            )}
            {exportNote && (
              <div className="rounded-xl border border-accent/30 bg-panel/90 px-3 py-2 text-sm text-paper/80">
                {exportNote}
              </div>
            )}
            <button
              type="button"
              onClick={download}
              disabled={!batch || busy || exporting}
              className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-ink shadow-lg shadow-black/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? "Writing .3mf…" : "Download .3mf"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
