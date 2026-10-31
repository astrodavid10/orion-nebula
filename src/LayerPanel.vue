<template>
  <div class="layer-panel" :class="{ collapsed: !expanded, kiosk }">
    <button
      type="button"
      class="panel-header"
      :aria-expanded="expanded"
      aria-controls="layer-panel-body"
      @click="expanded = !expanded"
    >
      <span class="panel-title">
        <font-awesome-icon icon="layer-group" />
        Layers
        <span class="panel-count" aria-hidden="true">{{ shownCount }}/{{ items.length }}</span>
        <span class="visually-hidden">, {{ shownCount }} of {{ items.length }} shown</span>
      </span>
      <font-awesome-icon class="panel-chevron" :icon="expanded ? 'chevron-up' : 'chevron-down'" />
    </button>

    <transition-expand>
      <div v-show="expanded" id="layer-panel-body" class="panel-body">
        <div class="panel-tools">
          <div class="panel-actions" role="group" aria-label="Show or hide all images">
            <button type="button" class="panel-action" v-tip="'The starting set of images'" @click="$emit('preset', 'default')">Reset</button>
            <button type="button" class="panel-action" @click="$emit('preset', 'all')">All</button>
            <button type="button" class="panel-action" @click="$emit('preset', 'none')">None</button>
          </div>
          <!-- One chip per telescope group: lit while any of its images is
               showing; pressing it shows or hides the whole group. Also the
               legend for the badges on the thumbnails. -->
          <div class="group-chips" role="group" aria-label="Show or hide by telescope">
            <button
              v-for="g in groupChips"
              :key="g.key"
              type="button"
              class="group-chip"
              :class="{ on: g.on }"
              :style="{ '--chip-color': g.color }"
              :aria-pressed="g.on"
              :aria-label="g.label"
              v-tip="g.label"
              @click="$emit('group', g.key, !g.on)"
            >
              <font-awesome-icon :icon="g.icon" />
              <span class="chip-count" aria-hidden="true">{{ g.count }}</span>
            </button>
          </div>
        </div>

        <!-- Top of the stack first, like a layer list in an image editor:
             the smallest, sharpest images sit on top of the wide ones. -->
        <ol class="layer-list" aria-label="Image layers, top of the stack first" @wheel="onListWheel">
          <li
            v-for="item in items"
            :key="item.key"
            :class="['layer-row', { selected: selectedKey === item.key, off: opacityOf(item.key) === 0 }]"
          >
            <!-- Mouse/touch convenience; the name button is the keyboard and
                 screen-reader target (thumbnails are hidden on phones). -->
            <div class="layer-thumb-btn" aria-hidden="true" @click="$emit('select', item.place)">
              <img
                class="layer-thumb"
                :src="item.thumb"
                alt=""
                crossorigin="anonymous"
                loading="lazy"
                @load="onThumbLoad($event)"
                @error="onThumbError(item.place, $event)"
              />
              <span
                v-if="item.badge"
                class="type-badge"
                :style="{ color: item.badge.color, borderColor: item.badge.color }"
                aria-hidden="true"
              >
                <font-awesome-icon :icon="item.badge.icon" />
              </span>
            </div>
            <div class="layer-main">
              <button
                type="button"
                class="layer-name"
                :title="item.name"
                :aria-label="item.badge ? `Go to ${item.name} (${item.badge.label})` : `Go to ${item.name}`"
                :aria-current="selectedKey === item.key ? 'true' : undefined"
                @click="$emit('select', item.place)"
              >{{ item.name }}</button>
              <div class="layer-controls">
                <button
                  type="button"
                  class="layer-icon-btn"
                  :aria-pressed="opacityOf(item.key) > 0"
                  :aria-label="`Show ${item.name}`"
                  @click="$emit('toggle', item.key)"
                >
                  <font-awesome-icon :icon="opacityOf(item.key) > 0 ? 'eye' : 'eye-slash'" />
                </button>
                <input
                  class="layer-range"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  :value="opacityOf(item.key)"
                  :aria-label="`${item.name} opacity`"
                  :aria-valuetext="`${opacityOf(item.key)} percent`"
                  @input="onRange(item.key, $event)"
                />
                <span class="layer-pct" aria-hidden="true">{{ opacityOf(item.key) }}%</span>
                <button
                  type="button"
                  class="layer-icon-btn layer-solo"
                  :aria-label="`Show only ${item.name}`"
                  v-tip="'Show only this image'"
                  @click="$emit('solo', item.key)"
                >
                  <font-awesome-icon icon="bullseye" />
                </button>
              </div>
            </div>
          </li>
        </ol>
      </div>
    </transition-expand>
  </div>
</template>

<script lang="ts">
import { defineComponent, markRaw, PropType } from "vue";
import { Place } from "@wwtelescope/engine";
import { TYPE_META, GROUP_META, GROUP_ORDER, typeForName, groupForName, LayerGroup, LayerTypeMeta } from "./layerTypes";
import { croppedTileUrl } from "./thumb-crop";
import { placeKey } from "./placeKey";

interface LayerItem {
  place: Place;
  key: string;
  name: string;
  badge: LayerTypeMeta | null;
  group: LayerGroup | null;
  thumb: string;
}

// The imageset's level-0 base tile is a sharp full-frame image; its
// ThumbnailUrl is a blurry 96×45. Fall back to the thumbnail on error.
function thumbUrlFor(place: Place): string {
  const iset = place.get_studyImageset() ?? place.get_backgroundImageset();
  const tpl = iset?.get_url() ?? "";
  if (tpl.includes("{1}")) {
    return tpl.replace(/\{1\}|\{2\}|\{3\}/g, "0");
  }
  return iset?.get_thumbnailUrl() || place.get_thumbnailUrl() || "";
}

export default defineComponent({
  name: "LayerPanel",

  props: {
    // Top of the stack first.
    places: { type: Array as PropType<Place[]>, default: () => [] as Place[] },
    // Percent, 0–100, keyed by placeKey.
    opacities: { type: Object as PropType<Record<string, number>>, required: true },
    selectedKey: { type: String, default: "" },
    kiosk: { type: Boolean, default: false },
    startOpen: { type: Boolean, default: true },
  },

  emits: ["select", "opacity", "toggle", "solo", "preset", "group"],

  data() {
    return { expanded: this.startOpen };
  },

  computed: {
    items(): LayerItem[] {
      return markRaw(this.places.map((place) => {
        const name = place.get_name();
        const t = typeForName(name);
        return {
          place,
          key: placeKey(place),
          name,
          badge: t ? TYPE_META[t] : null,
          group: groupForName(name),
          thumb: thumbUrlFor(place),
        };
      }));
    },
    shownCount(): number {
      return this.items.filter((it) => this.opacityOf(it.key) > 0).length;
    },
    groupChips(): { key: LayerGroup; label: string; color: string; icon: string; count: number; on: boolean }[] {
      return GROUP_ORDER
        .map((key) => {
          const members = this.items.filter((it) => it.group === key);
          const shown = members.filter((it) => this.opacityOf(it.key) > 0).length;
          const meta = GROUP_META[key];
          return {
            key,
            label: `${meta.label}: ${shown} of ${members.length} shown`,
            color: meta.color,
            icon: meta.icon,
            count: members.length,
            on: shown > 0,
          };
        })
        .filter((g) => g.count > 0);
    },
  },

  methods: {
    opacityOf(key: string): number {
      return this.opacities[key] ?? 0;
    },
    onRange(key: string, ev: Event): void {
      this.$emit("opacity", key, Number((ev.target as HTMLInputElement).value));
    },
    // Kiosk strip: let a mouse wheel scroll it sideways.
    onListWheel(ev: WheelEvent): void {
      if (!this.kiosk) { return; }
      if (Math.abs(ev.deltaY) <= Math.abs(ev.deltaX)) { return; }
      (ev.currentTarget as HTMLElement).scrollLeft += ev.deltaY;
      ev.preventDefault();
    },
    onThumbError(place: Place, ev: Event): void {
      const img = ev.target as HTMLImageElement;
      if (img.dataset.fallback) { return; }
      img.dataset.fallback = "1";
      img.removeAttribute("crossorigin");
      const iset = place.get_studyImageset() ?? place.get_backgroundImageset();
      img.src = iset?.get_thumbnailUrl() || place.get_thumbnailUrl() || "";
    },
    // Swap in a content-cropped copy so letterboxed tiles fill the square.
    onThumbLoad(ev: Event): void {
      const img = ev.target as HTMLImageElement;
      if (img.dataset.cropped || img.dataset.fallback) { return; }
      croppedTileUrl(img.src).then((dataUrl) => {
        if (img.dataset.fallback) { return; }
        img.dataset.cropped = "1";
        if (dataUrl) { img.src = dataUrl; }
      });
    },
  },
});
</script>

<style scoped lang="less">
/* No backdrop-filter: it is recomputed every frame over the live canvas. */
.layer-panel {
  pointer-events: auto;
  width: 17rem;
  max-width: 46vw;
  background-color: rgba(4, 6, 24, 0.9);
  border: 1px solid var(--accent-color);
  border-radius: 10px;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 2rem);
  max-height: calc(100dvh - 2rem);
}

.panel-header {
  background: none;
  border: none;
  font: inherit;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  color: var(--accent-color);
  font-weight: bold;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  &:focus-visible {
    outline: 2px solid var(--accent-color2);
    outline-offset: -2px;
  }
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.95rem;
}

.panel-count {
  color: var(--accent-color2);
  background: rgba(153, 200, 255, 0.12);
  border-radius: 999px;
  padding: 0 0.45rem;
  font-size: 0.75rem;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
}

.panel-chevron {
  color: var(--accent-color2);
}

.panel-body {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.panel-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  padding: 0.4rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.panel-actions,
.group-chips {
  display: flex;
  gap: 0.25rem;
}

.panel-action,
.group-chip {
  --chip-color: var(--accent-color2);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.45rem;
  font: inherit;
  font-size: 0.72rem;
  line-height: 1;
  color: #cdd3e0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  cursor: pointer;

  &:hover {
    color: #fff;
    border-color: var(--chip-color);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-color2);
    outline-offset: 1px;
  }
}

.group-chip.on {
  color: var(--chip-color);
  border-color: var(--chip-color);
  background: rgba(255, 255, 255, 0.12);
}

.chip-count {
  font-variant-numeric: tabular-nums;
}

.layer-list {
  list-style: none;
  margin: 0;
  padding: 0.4rem;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.25);
    border-radius: 3px;
  }
}

.layer-row {
  flex: 0 0 auto;
  display: flex;
  gap: 0.45rem;
  align-items: stretch;
  padding: 0.25rem;
  border: 1px solid rgba(133, 133, 134, 0.35);
  border-radius: 6px;
  transition: border-color 150ms ease;

  &.selected {
    border-color: var(--accent-color);
    box-shadow: 0 0 6px var(--accent-color);
  }

  &.off .layer-thumb {
    opacity: 0.4;
  }
  &.off .layer-name {
    color: rgba(255, 255, 255, 0.7);
  }
}

.layer-thumb-btn {
  position: relative;
  flex: 0 0 3.4rem;
  width: 3.4rem;
  height: 3.4rem;
  padding: 0;
  border: none;
  border-radius: 4px;
  overflow: hidden;
  background: #000;
  cursor: pointer;

  &:hover {
    box-shadow: 0 0 0 2px var(--accent-color2);
  }
}

.layer-thumb {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 150ms ease;
}

.type-badge {
  position: absolute;
  top: 0.15rem;
  left: 0.15rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.1rem;
  height: 1.1rem;
  font-size: 0.55rem;
  border: 1px solid currentColor;
  border-radius: 50%;
  background: rgba(4, 6, 24, 0.85);
  pointer-events: none;
}

.layer-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.15rem;
}

.layer-name {
  display: block;
  width: 100%;
  padding: 0.05rem 0.1rem;
  font: inherit;
  font-size: 0.76rem;
  line-height: 1.2;
  text-align: left;
  color: #fff;
  background: none;
  border: none;
  border-radius: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  user-select: none;

  &:hover {
    color: var(--accent-color2);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-color2);
    outline-offset: 0;
  }
}

.layer-controls {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.layer-icon-btn {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  padding: 0;
  font-size: 0.72rem;
  color: var(--accent-color2);
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  cursor: pointer;

  &:hover {
    color: #fff;
    border-color: var(--accent-color2);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-color2);
    outline-offset: 1px;
  }

  &[aria-pressed="false"] {
    color: rgba(255, 255, 255, 0.6);
  }
}

.layer-range {
  flex: 1 1 auto;
  min-width: 3rem;
  margin: 0;
  accent-color: var(--accent-color);
  cursor: pointer;
}

.layer-pct {
  flex: 0 0 2.2rem;
  text-align: right;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.8);
  font-variant-numeric: tabular-nums;
}

/* ── Kiosk: a full-width strip of layer cards along the top ─────────────── */
.layer-panel.kiosk {
  width: 100%;
  max-width: none;
  max-height: none;
  border-top: none;
  border-left: none;
  border-right: none;
  border-radius: 0 0 12px 12px;

  .panel-header {
    min-height: 3rem;
  }

  .layer-list {
    flex-direction: row;
    align-items: stretch;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar {
      width: auto;
      height: 6px;
    }
  }

  .layer-row {
    flex: 0 0 12rem;
    flex-direction: column;
  }

  .layer-thumb-btn {
    flex: none;
    width: 100%;
    height: 5.5rem;
  }

  .layer-name {
    font-size: 0.85rem;
  }

  .layer-icon-btn {
    width: 2.2rem;
    height: 2.2rem;
    font-size: 0.9rem;
  }

  .panel-action,
  .group-chip {
    font-size: 0.85rem;
    padding: 0.35rem 0.65rem;
  }
}

/* Phones and short landscape screens: a compact rail without thumbnails,
   percentages or the solo button (Solo is one tap away via None + eye). */
.compact() {
  .layer-panel:not(.kiosk) {
    .layer-thumb-btn,
    .layer-pct,
    .layer-solo {
      display: none;
    }
    .layer-name {
      font-size: 0.74rem;
    }
    .panel-tools {
      padding: 0.3rem;
      gap: 0.25rem;
    }
    .panel-actions,
    .group-chips {
      flex-wrap: wrap;
    }
    .layer-row {
      padding: 0.2rem 0.3rem;
    }
  }
}

@media (max-width: 600px) {
  .layer-panel {
    width: 11rem;
    max-height: 46vh;
    max-height: 46dvh;
  }
  .panel-header {
    padding: 0.45rem 0.55rem;
  }
  .panel-title {
    font-size: 0.9rem;
  }
  .compact();
}

@media (max-height: 500px) and (orientation: landscape) {
  .layer-panel {
    width: 12rem;
    max-height: calc(100dvh - 1rem);
  }
  .compact();
}
</style>
