const PHONE_DISPLAY = "(+63) 917 8514277";
const PHONE_TEL = "+639178514277";
const FACEBOOK = "https://www.facebook.com/Mike.D.Corpuz";
const MESSENGER = "https://m.me/Mike.D.Corpuz";

export function PrintRequests() {
  return (
    <section className="border-b border-line px-5 py-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-accent">Print requests</div>
      <p className="mt-1 text-sm leading-snug text-paper/90">
        Want this printed? Call or message Mike.
      </p>
      <a
        href={`tel:${PHONE_TEL}`}
        className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-paper hover:text-accent"
      >
        <span aria-hidden="true">🇵🇭</span>
        <span>{PHONE_DISPLAY}</span>
      </a>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a
          href={`tel:${PHONE_TEL}`}
          className="rounded-lg border border-accent/50 bg-accent/15 px-3 py-2 text-center text-sm font-medium text-accent hover:bg-accent/25"
        >
          Call
        </a>
        <a
          href={MESSENGER}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-line bg-ink/40 px-3 py-2 text-center text-sm font-medium text-paper hover:border-line hover:text-paper"
        >
          Message
        </a>
      </div>
      <a
        href={FACEBOOK}
        target="_blank"
        rel="noreferrer"
        className="mt-2 block text-[11px] text-muted underline-offset-2 hover:text-paper hover:underline"
      >
        facebook.com/Mike.D.Corpuz
      </a>
    </section>
  );
}
