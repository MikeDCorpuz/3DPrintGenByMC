import { useEffect, useMemo, useRef, useState } from "react";
import { Controls } from "./components/Controls";
import { Preview } from "./components/Preview";
import { ProductTabs } from "./components/ProductTabs";
import { StatsBar } from "./components/StatsBar";
import { SupportBanner } from "./components/SupportBanner";
import { export3mf } from "./lib/export3mf";
import { loadFont } from "./lib/fontCache";
import { buildBatch, disposeBatch } from "./lib/geometry";
import { punchLetterBeadCords } from "./lib/letterBead";
import { getFont } from "./lib/fonts";
import { parseNames } from "./lib/names";
import {
  designFingerprint,
  loadStats,
  trackDownload,
  trackGenerated,
  trackVisit,
  type SiteStats,
} from "./lib/stats";
import {
  DEFAULT_PARAMS,
  isClickerProduct,
  isClickerV2,
  isMonogramProduct,
  isNameplateProduct,
  isPetTagProduct,
  isLetterCharmProduct,
  isLetterBeadProduct,
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
  const [stats, setStats] = useState<SiteStats | null>(null);

  const fontLabel = useMemo(() => {
    const letter = getFont(params.fontId).name;
    if (!isMonogramProduct(params.productType) && !isLetterCharmProduct(params.productType)) return letter;
    return `${letter} + ${getFont(params.scriptFontId).name}`;
  }, [params.fontId, params.scriptFontId, params.productType]);
  const names = useMemo(
    () => parseNames(params.name, params.textCase),
    [params.name, params.textCase],
  );
  const batchRef = useRef<BuiltBatch | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const current = await loadStats();
      if (cancelled) return;
      setStats(current);
      const visits = await trackVisit();
      if (cancelled || visits == null) return;
      setStats((prev) => ({
        visits,
        generated: prev?.generated ?? current.generated,
        downloads: prev?.downloads ?? current.downloads,
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);
    const handle = window.setTimeout(async () => {
      try {
        const font = await loadFont(params.fontId);
        const scriptFont =
          isMonogramProduct(params.productType) || isLetterCharmProduct(params.productType)
            ? await loadFont(params.scriptFontId)
            : undefined;
        if (cancelled) return;
        const next = buildBatch(font, params, scriptFont);
        if (isLetterBeadProduct(params.productType)) await punchLetterBeadCords(next, params);
        if (cancelled) {
          disposeBatch(next);
          return;
        }
        const previous = batchRef.current;
        batchRef.current = next;
        setBatch(next);
        if (previous && previous !== next) disposeBatch(previous);

        const fingerprint = designFingerprint({
          productType: params.productType,
          name: params.name,
          fontId: params.fontId,
          scriptFontId: params.scriptFontId,
          monogramLetter: params.monogramLetter,
        });
        const generated = await trackGenerated(fingerprint);
        if (!cancelled && generated != null) {
          setStats((prev) =>
            prev ? { ...prev, generated } : { visits: 0, generated, downloads: 0 },
          );
        }
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
      const { filename, repairedParts } = await export3mf(batch, params);
      const downloads = await trackDownload();
      setStats((prev) =>
        prev ? { ...prev, downloads } : { visits: 0, generated: 0, downloads },
      );
      const mapHint = isClickerProduct(params.productType)
        ? "map Housing / Keycap / Outline / Letter to your AMS slots"
        : isMonogramProduct(params.productType)
          ? "map Letter stand / Rim / Script to your AMS slots"
          : isNameplateProduct(params.productType)
            ? "map Desk plate / Frame / Name to your AMS slots"
            : isLetterCharmProduct(params.productType)
              ? "map Letter charm to one filament (the name is a recess, not a second color)"
              : isLetterBeadProduct(params.productType)
                ? "map Cloud / Letter to your AMS slots"
                : isPetTagProduct(params.productType)
              ? "map Pet tag / Rim / Name to your AMS slots"
              : "map Outer / Outline / Name to your AMS slots";
      const repairNote =
        repairedParts > 0
          ? ` Auto-repaired ${repairedParts} mesh${repairedParts === 1 ? "" : "es"} before export.`
          : "";
      setExportNote(
        `Saved ${filename}.${repairNote} In Bambu Studio use File → Open (not geometry-only). If a color dialog appears, ${mapHint}. If anything still looks open, right-click the model → Fix Model.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const noun = isMonogramProduct(params.productType)
    ? "letter stand"
    : isNameplateProduct(params.productType)
      ? "name plate"
      : isLetterCharmProduct(params.productType)
        ? "letter charm"
        : isLetterBeadProduct(params.productType)
          ? "letter bead"
          : isPetTagProduct(params.productType)
          ? "pet tag"
          : isClickerProduct(params.productType)
            ? isClickerV2(params.productType)
              ? "clicker v2"
              : "clicker"
            : "keychain";
  const previewTitle =
    names.length === 1 ? names[0] : `${names.length} ${noun}s`;
  const isDesktopApp = import.meta.env.VITE_DESKTOP === "1";

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-[400px] shrink-0 flex-col border-r border-line bg-panel">
        <header className="border-b border-line px-5 py-4">
          <div className="text-[11px] uppercase tracking-[0.2em] text-accent">Parametric by Mike Corpuz</div>
          <h1 className="mt-1 text-xl font-semibold">3D Print Studio</h1>
          <div className="mt-0.5 flex items-center justify-between gap-3 text-xs text-muted">
            <span>Keychains · letter charms · beads · tags · plates</span>
            {!isDesktopApp && (
              <a
                href="/downloads/"
                className="shrink-0 text-accent/90 underline-offset-2 hover:text-accent hover:underline"
              >
                Windows app
              </a>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Pick a product below, pack the 256 × 256 mm bed, then download one multi-body .3mf.
          </p>
          <div className="mt-3">
            <StatsBar stats={stats} />
          </div>
        </header>
        {!isDesktopApp && <SupportBanner />}
        <ProductTabs params={params} onChange={patch} />
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
                {params.productType === "keychain" ||
                params.productType === "nameplate" ||
                params.productType === "pet-tag"
                  ? " or length"
                  : isMonogramProduct(params.productType) || isLetterCharmProduct(params.productType)
                    ? " or letter height"
                    : isLetterBeadProduct(params.productType)
                      ? " or bead size"
                      : ""}
                .
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
            <div className="rounded-xl border border-line/80 bg-panel/90 px-3 py-2 text-[11px] leading-relaxed text-muted backdrop-blur">
              <span className="font-medium text-paper/80">Disclaimer:</span> download runs an automatic
              mesh repair to close open edges when possible. The preview keeps the recess visible, so
              a shallow pocket can look stronger on screen than in a slicer. If a slicer shows open
              edges, right-click the model → <span className="text-paper/90">Fix Model</span>, then
              slice.
            </div>
            <button
              type="button"
              onClick={download}
              disabled={!batch || busy || exporting}
              className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-ink shadow-lg shadow-black/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? "Repairing & writing .3mf…" : "Download .3mf"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
