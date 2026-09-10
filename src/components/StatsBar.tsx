import type { SiteStats } from "../lib/stats";

interface StatsBarProps {
  stats: SiteStats | null;
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

const ITEMS: { key: keyof SiteStats; label: string }[] = [
  { key: "visits", label: "Visits" },
  { key: "generated", label: "3D generated" },
  { key: "downloads", label: "Downloads" },
];

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
      {ITEMS.map((item) => (
        <div key={item.key} className="bg-panel px-2 py-2 text-center">
          <div className="font-mono text-sm text-paper">
            {stats ? formatCount(stats[item.key]) : "—"}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
