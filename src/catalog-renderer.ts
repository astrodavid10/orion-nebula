// Proplyd and JuMBO markers (audit O7): a 2D canvas laid over the WWT canvas,
// redrawn after every WWT frame (engine-pinia addFrameCallback) so markers stay
// locked to the sky while panning and zooming. It uses only the public
// RA/Dec → screen projection, no engine internals.
//
// Proplyds are rings and JuMBOs are diamonds, in a colour-blind-safe pair
// (Okabe–Ito sky blue and yellow) with a dark outline so both read against the
// bright nebula. Marker size grows as you zoom in and the markers fade out
// when zoomed far out, where all 192 would collapse into one blob.

export type CatalogKind = "proplyd" | "jumbo";

export interface CatalogPoint {
  kind: CatalogKind;
  name: string;
  ra: number;  // degrees
  dec: number; // degrees
}

export const CATALOG_STYLE: Record<CatalogKind, { color: string; label: string }> = {
  proplyd: { color: "#56b4e9", label: "Proplyds" },
  jumbo: { color: "#f0e442", label: "JuMBOs" },
};

type Project = (raDeg: number, decDeg: number) => { x: number; y: number } | null;

interface Projected {
  point: CatalogPoint;
  x: number;
  y: number;
}

const D2R = Math.PI / 180;

export class CatalogOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private points: CatalogPoint[] = [];
  private visible: Record<CatalogKind, boolean> = { proplyd: true, jumbo: true };
  private projected: Projected[] = [];
  private highlight: CatalogPoint | null = null;
  private radius = 0;

  constructor(host: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "catalog-overlay";
    this.canvas.setAttribute("aria-hidden", "true");
    Object.assign(this.canvas.style, {
      position: "absolute", inset: "0", width: "100%", height: "100%",
      pointerEvents: "none", zIndex: "1",
    });
    host.appendChild(this.canvas);
    const ctx = this.canvas.getContext("2d");
    if (!ctx) { throw new Error("2D canvas unavailable"); }
    this.ctx = ctx;
  }

  destroy(): void {
    this.canvas.remove();
  }

  setPoints(points: CatalogPoint[]): void {
    this.points = points;
  }

  setVisible(kind: CatalogKind, on: boolean): void {
    this.visible[kind] = on;
  }

  setHighlight(point: CatalogPoint | null): void {
    this.highlight = point;
  }

  /**
   * Redraw for the current view. `center` is the view centre (radians) and
   * `fovDeg` the vertical field of view; points more than 60° from the centre
   * are skipped (the sky projection mirrors the far hemisphere).
   */
  draw(project: Project, center: { raRad: number; decRad: number }, fovDeg: number): void {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    this.projected = [];

    // Size: ~7 px across the inner nebula (fov ≈ 0.25°), never under 3 px;
    // fully hidden beyond ~6° where the field is a single blob.
    this.radius = Math.max(3, Math.min(10, 7 * Math.sqrt(0.25 / Math.max(fovDeg, 1e-3))));
    const alpha = fovDeg > 6 ? 0 : fovDeg > 3 ? (6 - fovDeg) / 3 : 1;
    if (alpha <= 0) { return; }

    const cosLimit = Math.cos(60 * D2R);
    const sinDec0 = Math.sin(center.decRad);
    const cosDec0 = Math.cos(center.decRad);
    for (const p of this.points) {
      if (!this.visible[p.kind]) { continue; }
      const dec = p.dec * D2R;
      const cosSep = sinDec0 * Math.sin(dec) + cosDec0 * Math.cos(dec) * Math.cos(p.ra * D2R - center.raRad);
      if (cosSep < cosLimit) { continue; }
      const sp = project(p.ra, p.dec);
      if (!sp || !isFinite(sp.x) || !isFinite(sp.y)) { continue; }
      if (sp.x < -20 || sp.y < -20 || sp.x > w + 20 || sp.y > h + 20) { continue; }
      this.projected.push({ point: p, x: sp.x, y: sp.y });
    }

    ctx.globalAlpha = alpha;
    for (const pr of this.projected) {
      this.drawMarker(pr.point.kind, pr.x, pr.y, this.radius, pr.point === this.highlight);
    }
    ctx.globalAlpha = 1;
  }

  private drawMarker(kind: CatalogKind, x: number, y: number, r: number, hot: boolean): void {
    const ctx = this.ctx;
    const color = CATALOG_STYLE[kind].color;
    const path = new Path2D();
    if (kind === "proplyd") {
      path.arc(x, y, r, 0, Math.PI * 2);
    } else {
      const d = r * 1.25;
      path.moveTo(x, y - d);
      path.lineTo(x + d, y);
      path.lineTo(x, y + d);
      path.lineTo(x - d, y);
      path.closePath();
    }
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.75)";
    ctx.lineWidth = hot ? 5 : 4;
    ctx.stroke(path);
    ctx.strokeStyle = color;
    ctx.lineWidth = hot ? 2.5 : 1.75;
    ctx.stroke(path);
    if (hot) {
      ctx.fillStyle = color + "40";
      ctx.fill(path);
    }
  }

  /** Nearest drawn marker within `radiusPx` of (x, y) in canvas CSS pixels. */
  hitTest(x: number, y: number, radiusPx: number): CatalogPoint | null {
    let best: CatalogPoint | null = null;
    let bestD = (Math.max(radiusPx, this.radius + 4)) ** 2;
    for (const pr of this.projected) {
      const d = (pr.x - x) ** 2 + (pr.y - y) ** 2;
      if (d <= bestD) { bestD = d; best = pr.point; }
    }
    return best;
  }

  /** Screen position of a drawn marker (for anchoring its hover label). */
  screenPosition(point: CatalogPoint): { x: number; y: number } | null {
    const pr = this.projected.find((p) => p.point === point);
    return pr ? { x: pr.x, y: pr.y } : null;
  }

  drawnCount(): number {
    return this.projected.length;
  }
}
