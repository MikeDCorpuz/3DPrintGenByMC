export type StatKey = "visits" | "generated" | "downloads";

export interface SiteStats {
  visits: number;
  generated: number;
  downloads: number;
}

const NAMESPACE = "print3dbymc";
const BASE = "https://abacus.jasoncameron.dev";
const SESSION_VISIT = "print3d-stats-visit";
const SESSION_DESIGNS = "print3d-stats-designs";

async function readValue(key: StatKey): Promise<number> {
  try {
    const res = await fetch(`${BASE}/get/${NAMESPACE}/${key}`);
    if (!res.ok) return 0;
    const data = (await res.json()) as { value?: number };
    return Number(data.value) || 0;
  } catch {
    return 0;
  }
}

async function bump(key: StatKey): Promise<number> {
  try {
    const res = await fetch(`${BASE}/hit/${NAMESPACE}/${key}`);
    if (!res.ok) return 0;
    const data = (await res.json()) as { value?: number };
    return Number(data.value) || 0;
  } catch {
    return 0;
  }
}

export async function loadStats(): Promise<SiteStats> {
  const [visits, generated, downloads] = await Promise.all([
    readValue("visits"),
    readValue("generated"),
    readValue("downloads"),
  ]);
  return { visits, generated, downloads };
}

/** Count one site visit per browser session. */
export async function trackVisit(): Promise<number | null> {
  try {
    if (sessionStorage.getItem(SESSION_VISIT)) return null;
  } catch {
    // Private mode: still count the visit.
  }
  const value = await bump("visits");
  try {
    sessionStorage.setItem(SESSION_VISIT, "1");
  } catch {
    // ignore
  }
  return value;
}

/** Count a unique design build once per session fingerprint. */
export async function trackGenerated(fingerprint: string): Promise<number | null> {
  if (!fingerprint) return null;
  let seen: string[] = [];
  try {
    seen = JSON.parse(sessionStorage.getItem(SESSION_DESIGNS) || "[]") as string[];
    if (!Array.isArray(seen)) seen = [];
    if (seen.includes(fingerprint)) return null;
  } catch {
    seen = [];
  }
  const value = await bump("generated");
  try {
    seen.push(fingerprint);
    if (seen.length > 80) seen = seen.slice(-80);
    sessionStorage.setItem(SESSION_DESIGNS, JSON.stringify(seen));
  } catch {
    // ignore
  }
  return value;
}

export async function trackDownload(): Promise<number> {
  return bump("downloads");
}

export function designFingerprint(parts: {
  productType: string;
  name: string;
  fontId: string;
  scriptFontId: string;
  monogramLetter: string;
}): string {
  return [
    parts.productType,
    parts.name.trim().toLowerCase(),
    parts.fontId,
    parts.scriptFontId,
    parts.monogramLetter.trim().toUpperCase(),
  ].join("|");
}
