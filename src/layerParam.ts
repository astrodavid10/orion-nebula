// ?layers= — the layer stack's opacities in the URL, so Share reproduces a
// blend. Lists only the visible layers, top of the stack first:
//
//   ?layers=jwst-miri,hubble-optical:40,matt-harbison-ha-lrgb
//
// A bare slug is 100%; `slug:NN` is NN% (1–99); unlisted layers are 0.
// `?layers=none` hides everything. Slugs are normalizeName() of the Place name
// with hyphens, so they survive renames that only change punctuation.
import { normalizeName } from "./layerTypes";

export function layerSlug(name: string): string {
  return normalizeName(name).replace(/ /g, "-");
}

/** Parse the param into slug → percent. null when absent or empty. */
export function parseLayersParam(value: string | null): Map<string, number> | null {
  if (value === null || value.trim() === "") { return null; }
  const out = new Map<string, number>();
  if (value.trim().toLowerCase() === "none") { return out; }
  for (const part of value.split(",")) {
    const [rawSlug, rawPct] = part.split(":");
    const slug = layerSlug(rawSlug ?? "");
    if (!slug) { continue; }
    const pct = rawPct === undefined ? 100 : Number(rawPct);
    if (!Number.isFinite(pct)) { continue; }
    out.set(slug, Math.round(Math.min(100, Math.max(0, pct))));
  }
  return out;
}

/** Format [name, percent] pairs (in display order) as the param value. */
export function formatLayersParam(entries: [string, number][]): string {
  const parts = entries
    .filter(([, pct]) => pct > 0)
    .map(([name, pct]) => (pct >= 100 ? layerSlug(name) : `${layerSlug(name)}:${Math.round(pct)}`));
  return parts.length ? parts.join(",") : "none";
}
