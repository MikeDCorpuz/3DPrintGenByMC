import { useState } from "react";

type Wallet = "maya" | "gcash";

const WALLETS: Record<
  Wallet,
  { label: string; src: string; hint: string; accent: string }
> = {
  maya: {
    label: "Maya",
    src: "/support/maya-qr.png",
    hint: "@mikecorpuz · InstaPay",
    accent: "#00A87E",
  },
  gcash: {
    label: "GCash",
    src: "/support/gcash-qr.png",
    hint: "InstaPay · transfer fees may apply",
    accent: "#007DFF",
  },
};

export function SupportBanner() {
  const [open, setOpen] = useState<Wallet | null>(null);

  return (
    <section className="border-b border-line bg-gradient-to-b from-[#1a1510] to-panel px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-accent">Buy me a coffee</div>
          <p className="mt-1 text-sm leading-snug text-paper/90">
            If this helped, or you want the code — tip Mike via Maya or GCash.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-accent/40 bg-accent/15 px-2.5 py-1 text-[11px] font-medium text-accent">
          Support
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {(Object.keys(WALLETS) as Wallet[]).map((id) => {
          const wallet = WALLETS[id];
          const active = open === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setOpen(active ? null : id)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                active
                  ? "border-accent/50 bg-accent/10 text-paper"
                  : "border-line bg-ink/40 text-muted hover:border-line hover:text-paper"
              }`}
            >
              <div className="font-medium" style={{ color: active ? wallet.accent : undefined }}>
                {wallet.label}
              </div>
              <div className="mt-0.5 text-[11px] text-muted">{active ? "Hide QR" : "Show QR"}</div>
            </button>
          );
        })}
      </div>

      {open && (
        <div className="mt-3 overflow-hidden rounded-xl border border-line bg-white p-3">
          <img
            src={WALLETS[open].src}
            alt={`${WALLETS[open].label} QR for Michael Corpuz`}
            className="mx-auto aspect-square w-full rounded-md"
          />
          <div className="mt-2 text-center text-[11px] text-ink/60">{WALLETS[open].hint}</div>
          <div className="mt-0.5 text-center text-xs font-medium text-ink">Michael Corpuz</div>
        </div>
      )}
    </section>
  );
}
