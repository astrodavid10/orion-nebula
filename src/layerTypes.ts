/**
 * What each Orion Nebula layer is: which telescope/instrument, which kind of
 * light. Drives the gallery's corner badge and its filter chips (same shape as
 * the JWST app's jwstTypes.ts, so ImageGallery.vue is shared unchanged).
 *
 * Keys are WTML Place names, matched through normalizeName().
 */

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[‘’']/g, "")      // straight + curly apostrophes
    .replace(/[–—]/g, "-")      // en/em dashes -> hyphen
    .replace(/[^a-z0-9]+/g, " ") // any other punctuation -> space
    .trim()
    .replace(/\s+/g, " ");
}

/** Instrument / kind of light. Drives the per-thumbnail badge. */
export type LayerType =
  | "webbNirCam"
  | "webbMiri"
  | "hubble"
  | "spitzer"
  | "groundInfrared"
  | "groundOptical"
  | "amateur";

/** Filter-chip bucket. */
export type LayerGroup = "webb" | "space" | "ground" | "amateur";

export interface LayerTypeMeta {
  /** Short human label (badge accessible name, chip tooltip). */
  label: string;
  color: string;
  /** Font Awesome free-solid icon name; must be registered in main.ts. */
  icon: string;
  group: LayerGroup;
}

export const TYPE_META: Record<LayerType, LayerTypeMeta> = {
  webbNirCam:     { label: "Webb NIRCam (near-infrared)",   color: "#f0ab52", icon: "satellite",      group: "webb" },
  webbMiri:       { label: "Webb MIRI (mid-infrared)",      color: "#ff7f50", icon: "satellite",      group: "webb" },
  hubble:         { label: "Hubble (visible light)",        color: "#6db3ff", icon: "satellite-dish", group: "space" },
  spitzer:        { label: "Spitzer (infrared + visible)",  color: "#c77dff", icon: "satellite-dish", group: "space" },
  groundInfrared: { label: "Ground telescope (infrared)",   color: "#ff6b6b", icon: "mountain",       group: "ground" },
  groundOptical:  { label: "Ground telescope (visible)",    color: "#7cfc9b", icon: "mountain",       group: "ground" },
  amateur:        { label: "Amateur astrophotography",      color: "#ffe066", icon: "camera",         group: "amateur" },
};

export interface LayerGroupMeta {
  label: string;
  color: string;
  icon: string;
}

export const GROUP_META: Record<LayerGroup, LayerGroupMeta> = {
  webb:    { label: "James Webb Space Telescope", color: "#f0ab52", icon: "satellite" },
  space:   { label: "Hubble and Spitzer",         color: "#6db3ff", icon: "satellite-dish" },
  ground:  { label: "Ground-based telescopes",    color: "#7cfc9b", icon: "mountain" },
  amateur: { label: "Amateur astrophotographers", color: "#ffe066", icon: "camera" },
};

export const GROUP_ORDER = Object.keys(GROUP_META) as LayerGroup[];

const RAW: Record<string, LayerType> = {};
function add(name: string, t: LayerType): void {
  RAW[normalizeName(name)] = t;
}

add("JWST - MIRI", "webbMiri");
add("JWST - NIRCam", "webbNirCam");
add("JWST - NIRCam Long-wavelength", "webbNirCam");
add("JWST - NIRCam Short-wavelength", "webbNirCam");
add("Hubble - Optical", "hubble");
add("Spitzer - Visible and Infrared Composite", "spitzer");
add("HAWK-I - Infrared", "groundInfrared");
add("VISTA - Infrared", "groundInfrared");
add("ESO/VST - Optical", "groundOptical");
add("Don McCrady - RGB/H-alpha", "amateur");
add("Matt Harbison - HA-LRGB", "amateur");

export function typeForName(name: string): LayerType | null {
  return RAW[normalizeName(name)] ?? null;
}

export function groupForName(name: string): LayerGroup | null {
  const t = typeForName(name);
  return t ? TYPE_META[t].group : null;
}

// Names the shared ImageGallery.vue imports.
export type JwstGroup = LayerGroup;
export type JwstTypeMeta = LayerTypeMeta;
