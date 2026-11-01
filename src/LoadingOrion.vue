<template>
  <svg class="loading-orion" :viewBox="viewBox" aria-hidden="true">
    <defs>
      <radialGradient id="lo-nebula" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffd0dc" stop-opacity="0.95" />
        <stop offset="35%" stop-color="#ff7fa3" stop-opacity="0.55" />
        <stop offset="100%" stop-color="#ff7fa3" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="lo-halo" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff" stop-opacity="0.55" />
        <stop offset="100%" stop-color="#fff" stop-opacity="0" />
      </radialGradient>
    </defs>

    <!-- Stick figure, drawn in after the stars appear. -->
    <path
      v-for="(seg, i) in segments"
      :key="'l' + i"
      class="lo-line"
      :d="seg.d"
      pathLength="1"
      :stroke-dashoffset="1 - lineProgress(i)"
      :opacity="fade"
    />

    <!-- The Orion Nebula (M42) in the sword: the app's subject, last to light. -->
    <circle
      class="lo-nebula"
      :cx="nebula.x"
      :cy="nebula.y"
      :r="2.2"
      fill="url(#lo-nebula)"
      :opacity="nebulaOpacity"
    />

    <g v-for="(s, i) in stars" :key="s.name" :opacity="starOpacity(i)">
      <circle v-if="s.r > 0.75" :cx="s.x" :cy="s.y" :r="s.r * 2.2" fill="url(#lo-halo)" />
      <circle :cx="s.x" :cy="s.y" :r="s.r" :fill="s.color" />
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent } from "vue";

// One build-up of the constellation per cycle.
const CYCLE_MS = 5200;

// J2000 RA/Dec (degrees), V magnitude and a colour from the spectral type.
interface Star { name: string; ra: number; dec: number; v: number; color: string }
const STARS: Star[] = [
  { name: "Rigel", ra: 78.6345, dec: -8.2016, v: 0.13, color: "#cfe0ff" },
  { name: "Betelgeuse", ra: 88.7929, dec: 7.4071, v: 0.42, color: "#ffb27a" },
  { name: "Bellatrix", ra: 81.2828, dec: 6.3497, v: 1.64, color: "#d6e4ff" },
  { name: "Alnilam", ra: 84.0534, dec: -1.2019, v: 1.69, color: "#d6e4ff" },
  { name: "Alnitak", ra: 85.1897, dec: -1.9426, v: 1.77, color: "#d6e4ff" },
  { name: "Saiph", ra: 86.9391, dec: -9.6696, v: 2.07, color: "#d6e4ff" },
  { name: "Mintaka", ra: 83.0017, dec: -0.2991, v: 2.23, color: "#d6e4ff" },
  { name: "Hatysa", ra: 83.8583, dec: -5.9099, v: 2.77, color: "#dfe8ff" },
  { name: "Tabit", ra: 72.4600, dec: 6.9613, v: 3.19, color: "#fff4e0" },
  { name: "Meissa", ra: 83.7845, dec: 9.9342, v: 3.39, color: "#dfe8ff" },
  { name: "pi4", ra: 72.8015, dec: 5.6051, v: 3.68, color: "#dfe8ff" },
  { name: "pi5", ra: 73.5629, dec: 2.4407, v: 3.71, color: "#dfe8ff" },
  { name: "mu", ra: 90.5958, dec: 9.6473, v: 4.12, color: "#fff4e0" },
  { name: "pi2", ra: 72.6530, dec: 8.9002, v: 4.35, color: "#fff" },
  { name: "chi1", ra: 88.5958, dec: 20.2762, v: 4.39, color: "#fff4e0" },
  { name: "nu", ra: 91.8930, dec: 14.7685, v: 4.42, color: "#dfe8ff" },
  { name: "pi6", ra: 74.6371, dec: 1.7140, v: 4.47, color: "#ffd9b0" },
  { name: "xi", ra: 92.9850, dec: 14.2088, v: 4.48, color: "#dfe8ff" },
  { name: "42 Ori", ra: 83.8463, dec: -4.8383, v: 4.59, color: "#dfe8ff" },
  { name: "chi2", ra: 90.9800, dec: 20.1380, v: 4.63, color: "#dfe8ff" },
  { name: "pi1", ra: 73.7240, dec: 10.1510, v: 4.65, color: "#fff" },
];
const M42 = { ra: 83.8221, dec: -5.3911 };

// Figure lines in drawing order: belt, body, head, bow, club.
const LINES: [string, string][] = [
  ["Mintaka", "Alnilam"], ["Alnilam", "Alnitak"],
  ["Alnitak", "Saiph"], ["Mintaka", "Rigel"],
  ["Alnitak", "Betelgeuse"], ["Mintaka", "Bellatrix"], ["Bellatrix", "Betelgeuse"],
  ["Bellatrix", "Meissa"], ["Meissa", "Betelgeuse"],
  ["Bellatrix", "Tabit"], ["pi1", "pi2"], ["pi2", "Tabit"], ["Tabit", "pi4"], ["pi4", "pi5"], ["pi5", "pi6"],
  ["Betelgeuse", "mu"], ["mu", "xi"], ["xi", "nu"], ["nu", "chi1"], ["xi", "chi2"],
];

// Tangent-plane projection about the figure's centre, east to the left as on
// the sky, in degrees.
const RA0 = 82.7;
const DEC0 = 5.3;
function project(ra: number, dec: number): { x: number; y: number } {
  const d2r = Math.PI / 180;
  const a = (ra - RA0) * d2r;
  const d = dec * d2r;
  const d0 = DEC0 * d2r;
  const cosc = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(a);
  const x = (Math.cos(d) * Math.sin(a)) / cosc;
  const y = (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(a)) / cosc;
  return { x: -x / d2r, y: -y / d2r };
}

const smooth = (a: number, b: number, t: number): number => {
  const c = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return c * c * (3 - 2 * c);
};

// Cycle timeline (fractions of CYCLE_MS).
const STARS_FROM = 0.03;
const STARS_TO = 0.38;
const LINES_FROM = 0.40;
const LINES_TO = 0.68;
const FADE_FROM = 0.9;

const PROJECTED = STARS.map((s) => ({
  ...s,
  ...project(s.ra, s.dec),
  r: Math.max(0.3, 1.0 - s.v * 0.15),
}));
const BY_NAME = new Map(PROJECTED.map((s) => [s.name, s]));
const SEGMENTS = LINES.map(([a, b]) => {
  const p = BY_NAME.get(a)!;
  const q = BY_NAME.get(b)!;
  return { d: `M${p.x.toFixed(2)},${p.y.toFixed(2)} L${q.x.toFixed(2)},${q.y.toFixed(2)}` };
});
const NEBULA = project(M42.ra, M42.dec);

const PAD = 2.5;
const xs = PROJECTED.map((s) => s.x);
const ys = PROJECTED.map((s) => s.y);
const VIEWBOX = [
  Math.min(...xs) - PAD, Math.min(...ys) - PAD,
  Math.max(...xs) - Math.min(...xs) + 2 * PAD, Math.max(...ys) - Math.min(...ys) + 2 * PAD,
].map((v) => v.toFixed(2)).join(" ");

export default defineComponent({
  name: "LoadingOrion",

  data() {
    // Reduced motion: the finished figure, held still.
    return { t: 0.85, raf: 0, start: 0 };
  },

  computed: {
    viewBox(): string { return VIEWBOX; },
    stars(): typeof PROJECTED { return PROJECTED; },
    segments(): typeof SEGMENTS { return SEGMENTS; },
    nebula(): { x: number; y: number } { return NEBULA; },
    fade(): number { return 1 - smooth(FADE_FROM, 1, this.t); },
    nebulaOpacity(): number {
      const pulse = 0.88 + 0.12 * Math.sin(this.t * Math.PI * 6);
      return smooth(0.62, 0.8, this.t) * this.fade * pulse;
    },
  },

  mounted() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { return; }
    this.start = performance.now();
    this.t = 0;
    const tick = (now: number): void => {
      this.t = ((now - this.start) % CYCLE_MS) / CYCLE_MS;
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  },

  beforeUnmount() {
    cancelAnimationFrame(this.raf);
  },

  methods: {
    // Brightest first, each fading in quickly, then a faint twinkle.
    starOpacity(i: number): number {
      const at = STARS_FROM + (STARS_TO - STARS_FROM) * (i / (STARS.length - 1));
      const twinkle = 0.85 + 0.15 * Math.sin(this.t * Math.PI * 8 + i * 1.7);
      return smooth(at, at + 0.06, this.t) * twinkle * this.fade;
    },
    lineProgress(i: number): number {
      const span = (LINES_TO - LINES_FROM) / LINES.length;
      const at = LINES_FROM + span * i;
      return smooth(at, at + span * 2.5, this.t);
    },
  },
});
</script>

<style lang="less">
.loading-orion {
  height: min(19rem, 46vh);
  width: auto;
  overflow: visible;

  .lo-line {
    fill: none;
    stroke: rgba(153, 200, 255, 0.55);
    stroke-width: 0.2;
    stroke-linecap: round;
    stroke-dasharray: 1;
  }
}
</style>
