<template>
  <v-app id="app" :style="cssVars">
    <div
      id="main-content"
      :class="{ kiosk: kioskMode }"
      @pointerdown="onViewerPointerDown"
      @pointermove="onViewerPointerMove"
      @pointerup="onViewerPointerUp"
      @pointerleave="hoverMarker.show = false"
    >
      <WorldWideTelescope :wwt-namespace="wwtNamespace"></WorldWideTelescope>

      <!-- Loading modal; becomes the error card if startup fails (audit E3). -->
      <transition name="fade">
        <div class="modal" id="modal-loading" v-show="isLoading || bootError">
          <div class="container" v-if="!bootError" role="status">
            <loading-orion />
            <p>{{ loadingStatus }}</p>
          </div>
          <div class="boot-error" v-else role="alert">
            <h2 class="boot-error-title">The images couldn't be loaded</h2>
            <p>{{ bootError }}</p>
            <button v-if="bootRetryable" type="button" class="boot-retry" @click="retryBoot">Try again</button>
            <p v-if="bootRetryInS" class="boot-auto">Trying again automatically in {{ bootRetryInS }} seconds.</p>
          </div>
        </div>
      </transition>

      <!-- Screen-reader-only page heading (the intro's h1 goes away with it)
           and polite announcements (audit J14). -->
      <h1 v-if="!showIntro" class="visually-hidden">{{ introTitle }}</h1>
      <div class="visually-hidden" aria-live="polite" aria-atomic="true">{{ liveMessage }}</div>

      <!-- Top-left controls: menu + fullscreen -->
      <div class="top-left-controls">
        <button
          ref="menuToggleBtn"
          class="control-btn"
          @click="toggleMenu"
          v-tip="'Menu'"
          aria-label="Menu"
          aria-haspopup="true"
          :aria-expanded="isMenuOpen"
          aria-controls="hamb-menu-list"
        >
          <font-awesome-icon icon="sliders-h" />
        </button>
        <button
          v-if="fullscreenAvailable && !kioskMode"
          class="control-btn"
          @click="toggleFullscreen"
          v-tip="fullscreenModeActive ? 'Exit fullscreen' : 'Fullscreen'"
          :aria-label="fullscreenModeActive ? 'Exit fullscreen' : 'Fullscreen'"
        >
          <font-awesome-icon :icon="fullscreenModeActive ? 'compress' : 'expand'" />
        </button>
        <ul id="hamb-menu-list" class="hamb-menu" :class="{ show: isMenuOpen }">
          <li><button type="button" class="hamb-menu-item" @click="openIntro">
            <font-awesome-icon icon="info-circle" /> Overview
          </button></li>
          <li v-if="tourPlaces.length"><button type="button" class="hamb-menu-item" @click="startTour">
            <font-awesome-icon icon="route" /> Guided tour
          </button></li>
          <li><button
            type="button"
            class="hamb-menu-item"
            aria-controls="survey-menu-list"
            :aria-expanded="showSurveyMenu"
            @click="toggleSurveyMenu"
          >
            <font-awesome-icon icon="panorama" /> Choose sky survey
          </button></li>
          <li><button type="button" class="hamb-menu-item" @click="openLink('https://www.rocketcenter.com/INTUITIVEPlanetarium/InteractiveAstronomy', 'INTUITIVE Planetarium')">
            <font-awesome-icon icon="building-columns" /> <span class="hamb-menu-label"><em>INTUITIVE</em><sup>®</sup>&nbsp;Planetarium</span>
          </button></li>
          <li><button type="button" class="hamb-menu-item" @click="openLink('https://worldwidetelescope.org/home/', 'WorldWide Telescope')">
            <img alt="WWT" class="hamb-menu-logo" src="./assets/logo_wwt.png" width="16" height="16" />
            <span class="hamb-menu-label">WorldWide Telescope</span>
          </button></li>
          <li><button type="button" class="hamb-menu-item" @click="openLink('https://arxiv.org/abs/2310.01231', 'JuMBOs publication')">
            <font-awesome-icon icon="newspaper" /> JuMBOs publication
          </button></li>
          <li><button type="button" class="hamb-menu-item" @click="openLink('https://arxiv.org/abs/astro-ph/0506650', 'Proplyds publication')">
            <font-awesome-icon icon="newspaper" /> Proplyds publication
          </button></li>
          <li v-if="kioskMode"><button type="button" class="hamb-menu-item" @click="showHomeQR">
            <font-awesome-icon icon="globe" /> Get this on your phone
          </button></li>
        </ul>

        <!-- Proplyd / JuMBO markers (audit O7): ring and diamond, the same
             shapes and colours as on the sky. -->
        <div class="catalog-toggles" role="group" aria-label="Markers on the sky">
          <button
            type="button"
            class="catalog-toggle proplyd"
            :class="{ on: showProplyds }"
            :aria-pressed="showProplyds"
            v-tip="'Proplyds: young stars with planet-forming disks'"
            @click="toggleCatalog('proplyd')"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5" /></svg>
            Proplyds
          </button>
          <button
            type="button"
            class="catalog-toggle jumbo"
            :class="{ on: showJumbos }"
            :aria-pressed="showJumbos"
            v-tip="'JuMBOs: free-floating pairs of planet-mass objects'"
            @click="toggleCatalog('jumbo')"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2 L14 8 L8 14 L2 8 Z" /></svg>
            JuMBOs
          </button>
        </div>
      </div>

      <!-- Layer panel (top-right; in kiosk mode a full-width strip along the
           top). Every image is on the sky at once; each row sets one layer's
           opacity, and selecting a name flies to it. -->
      <div class="gallery-wrap">
        <layer-panel
          :places="panelPlaces"
          :opacities="opacities"
          :selected-key="selectedKey"
          :kiosk="kioskMode"
          @select="onPanelSelect"
          @opacity="onPanelOpacity"
          @toggle="toggleLayer"
          @solo="soloLayer"
          @preset="applyPreset"
          @group="setGroupShown"
        ></layer-panel>
      </div>

      <!-- Intro modal -->
      <transition name="intro-fade">
        <div class="intro-backdrop" v-if="showIntro" @click.self="closeIntro" @keydown.esc="closeIntro">
          <div
            class="intro-modal"
            ref="introModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="intro-title"
            tabindex="-1"
            @keydown.tab="onIntroTabKey"
          >
            <button ref="introCloseBtn" class="intro-modal-close" @click="closeIntro" aria-label="Close">
              <font-awesome-icon icon="times" />
            </button>

            <div class="intro-modal-logos">
              <a href="https://www.rocketcenter.com/INTUITIVEPlanetarium" target="_blank" rel="noopener noreferrer">
                <img alt="INTUITIVE Planetarium at the U.S. Space &amp; Rocket Center" src="./assets/ip-ussrc.png" class="intro-logo-ip" />
              </a>
              <div class="intro-logo-row">
                <a href="https://www.cosmicds.cfa.harvard.edu/" target="_blank" rel="noopener noreferrer" class="intro-logo-attr">
                  <img alt="CosmicDS" src="./assets/logo_cosmicds.png" class="intro-logo-cds" />
                  <span>Interactive developed using the CosmicDS toolkit</span>
                </a>
              </div>
              <div class="intro-logo-row">
                <a href="https://worldwidetelescope.org/home/" target="_blank" rel="noopener noreferrer" class="intro-logo-attr">
                  <img alt="WorldWide Telescope" src="./assets/logo_wwt.png" class="intro-logo-wwt" />
                  <span>Powered by WorldWide Telescope</span>
                </a>
              </div>
            </div>

            <h1 id="intro-title" class="intro-title">{{ introTitle }}</h1>

            <div class="intro-body">
              <p>
                The Orion Nebula is one of the most photographed and most studied objects in the night sky:
                a nursery about 1,350 light-years away where stars and planetary systems are forming from
                collapsing clouds of gas and dust. Compare it through {{ places.length }} telescopes, from a
                backyard camera to the
                <a href="https://webbtelescope.org/" target="_blank" rel="noopener noreferrer" class="links">James Webb Space Telescope</a>,
                in their true place on the sky.
              </p>

              <h2 class="intro-section-title">How to Use</h2>
              <ul class="intro-instructions">
                <li><span class="intro-icon"><font-awesome-icon icon="layer-group" /></span>
                  <span><strong>Layers:</strong> Every image sits in its true place on the sky, the sharpest on top. Use each image's slider in the <em>Layers</em> panel to fade it in or out and compare what each telescope reveals.</span></li>
                <li><span class="intro-icon"><font-awesome-icon icon="globe" /></span>
                  <span><strong>Browse:</strong> Select an image's name to fly to it (and show it if it's hidden).</span></li>
                <li><span class="intro-icon"><font-awesome-icon icon="arrows-alt" /></span>
                  <span><strong>Navigate:</strong> Drag to pan; scroll or pinch to zoom.</span></li>
                <li><span class="intro-icon"><font-awesome-icon icon="circle-dot" /></span>
                  <span><strong>Markers:</strong> Rings mark proplyds (young stars with planet-forming disks) and diamonds mark JuMBOs (free-floating pairs of planet-mass objects). Select one to learn more.</span></li>
                <li><span class="intro-icon"><font-awesome-icon icon="panorama" /></span>
                  <span><strong>Sky surveys:</strong> Change the background survey from the menu to see the sky in other wavelengths.</span></li>
              </ul>
            </div>

            <div class="intro-actions">
              <button type="button" class="intro-action primary" @click="closeIntro">Start exploring</button>
              <button v-if="tourPlaces.length" type="button" class="intro-action" @click="startTour">
                <font-awesome-icon icon="route" /> Take the guided tour
              </button>
            </div>

            <div class="intro-credits">
              Interactive by
              <a href="https://twitter.com/ADavidWeigel" target="_blank" rel="noopener noreferrer" class="links">A. David Weigel</a>,
              <a href="https://www.linkedin.com/in/erika-s-a37431153/" target="_blank" rel="noopener noreferrer" class="links">Érika Silva</a>,
              <a href="https://newton.cx/~peter/" target="_blank" rel="noopener noreferrer" class="links">Peter K. G. Williams</a> and
              <a href="https://www.jcarifio.com/projects" target="_blank" rel="noopener noreferrer" class="links">Jon Carifio</a>,
              with <a href="https://www.cosmicds.cfa.harvard.edu/" target="_blank" rel="noopener noreferrer" class="links">CosmicDS</a> and
              the <a href="https://worldwidetelescope.org/home/" target="_blank" rel="noopener noreferrer" class="links">WorldWide Telescope</a> team.
            </div>
          </div>
        </div>
      </transition>

      <!-- Bottom dock: the survey menu, the marker card or the description
           panel, stacked in one flex column so they can't overlap each other.
           layoutDock() sizes it against the layer panel so it can't run under
           it either. -->
      <div ref="bottomDock" class="bottom-dock">
        <!-- Sky survey selector -->
        <transition name="fade">
          <div class="survey-menu" v-if="showSurveyMenu" @keydown.esc="showSurveyMenu = false">
            <div class="survey-head">
              <span class="survey-label"><font-awesome-icon icon="star" /> Sky survey</span>
              <button class="survey-close" @click="showSurveyMenu = false" aria-label="Close"><font-awesome-icon icon="times" /></button>
            </div>
            <ul id="survey-menu-list" class="survey-list">
              <li v-for="bg in backgroundImagesets" :key="bg.imagesetName">
                <button
                  type="button"
                  :class="['survey-option', { active: curBackgroundImagesetName === bg.imagesetName }]"
                  @click="selectSurvey(bg.imagesetName)"
                >
                  <font-awesome-icon icon="check" class="survey-check" />
                  <span>{{ bg.displayName }}</span>
                </button>
              </li>
            </ul>
          </div>
        </transition>

        <!-- Proplyd / JuMBO card (audit O12) -->
        <transition name="fade">
          <div v-if="selectedMarker" class="description-panel marker-card" aria-labelledby="marker-title">
            <button class="desc-close" @click="closeMarkerCard" aria-label="Close"><font-awesome-icon icon="times" /></button>
            <div class="desc-head">
              <span class="marker-card-shape" :class="selectedMarker.kind" aria-hidden="true">
                <svg v-if="selectedMarker.kind === 'proplyd'" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5" /></svg>
                <svg v-else viewBox="0 0 16 16"><path d="M8 2 L14 8 L8 14 L2 8 Z" /></svg>
              </span>
              <h2 id="marker-title" class="desc-title">{{ markerTitle }}</h2>
            </div>
            <div class="desc-body">
              <p class="desc-distance">{{ markerKindLabel }}</p>
              <figure v-if="selectedMarker.proplyd && selectedMarker.proplyd.cutout" class="marker-cutout">
                <img :src="selectedMarker.proplyd.cutout" :alt="`Hubble close-up of proplyd ${selectedMarker.name}`" width="128" height="128" />
                <figcaption>{{ selectedMarker.proplyd.caption }} <em>Hubble image: NASA/ESA and L. Ricci (ESO), CC BY 4.0.</em></figcaption>
              </figure>
              <p v-if="markerDetail" class="desc-text marker-detail">{{ markerDetail }}</p>
              <p class="desc-text">{{ markerIntro }}</p>
            </div>
            <div class="desc-actions">
              <button v-if="markerLink" type="button" class="desc-view2d" @click="openLink(markerLink.url, markerLink.label)">
                <font-awesome-icon icon="newspaper" /> {{ markerLink.label }}
              </button>
            </div>
          </div>
        </transition>

        <!-- Description / credits panel -->
        <transition name="fade">
          <div class="description-panel" v-if="selectedPlace && showDescription && !selectedMarker" aria-labelledby="desc-title">
            <button class="desc-close" @click="showDescription = false" aria-label="Close"><font-awesome-icon icon="times" /></button>
            <!-- Guided tour (audit J8): caption + Back/Next/Exit above the
                 regular description. -->
            <div v-if="tourActive" class="tour-strip">
              <div class="tour-head">
                <span class="tour-label"><font-awesome-icon icon="route" /> Guided tour · {{ tourIdx + 1 }} of {{ tourPlaces.length }}</span>
                <button type="button" class="tour-exit" @click="stopTour">Exit tour</button>
              </div>
              <p class="tour-caption">{{ tourCaption }}</p>
              <div class="tour-nav">
                <button type="button" class="tour-btn" :disabled="tourIdx === 0" @click="tourStep(-1)">
                  <font-awesome-icon icon="chevron-left" /> Back
                </button>
                <button type="button" class="tour-btn primary" @click="tourStep(1)">
                  {{ tourIdx === tourPlaces.length - 1 ? 'Finish' : 'Next' }} <font-awesome-icon icon="chevron-right" />
                </button>
              </div>
            </div>
            <div class="desc-head">
              <!-- P3.4: step to the previous image in the gallery's current
                   visible list (wraparound). Also bound to ArrowLeft. -->
              <button
                v-if="!tourActive"
                class="desc-step desc-step-prev"
                aria-label="Previous image"
                v-tip="'Previous image'"
                @click="stepImage(-1)"
              >
                <font-awesome-icon icon="chevron-left" />
              </button>
              <h2 id="desc-title" class="desc-title">{{ selectedName }}</h2>
              <!-- P3.4: step to the next image (wraparound). Also bound to
                   ArrowRight. margin pushes it clear of the absolute .desc-close X. -->
              <button
                v-if="!tourActive"
                class="desc-step desc-step-next"
                aria-label="Next image"
                v-tip="'Next image'"
                @click="stepImage(1)"
              >
                <font-awesome-icon icon="chevron-right" />
              </button>
            </div>
            <div ref="descBody" class="desc-body">
            <p class="desc-distance" v-if="imageSubtitle">{{ imageSubtitle }}</p>
            <p class="desc-text">{{ currentMeta.description || 'No description available for this image.' }}</p>
            <p class="desc-credits" v-if="currentMeta.credits || safeCreditsUrl">
              <em>Credits: {{ currentMeta.credits }}</em>
              <a
                v-if="safeCreditsUrl"
                :href="safeCreditsUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="links desc-learn"
              ><font-awesome-icon icon="arrow-up-right-from-square" /> Learn more</a>
            </p>
            </div>
            <div class="desc-actions">
              <button v-if="!kioskMode" type="button" class="desc-view2d" @click="shareView">
                <font-awesome-icon icon="share-nodes" /> {{ shareStatus || 'Share' }}
              </button>
            </div>
          </div>
        </transition>
      </div>

      <!-- Marker hover / first-tap label, anchored at the marker. -->
      <div
        v-if="hoverMarker.show"
        class="marker-tip"
        :style="{ left: hoverMarker.x + 'px', top: hoverMarker.y + 'px' }"
      >
        <span class="marker-tip-name">{{ hoverMarker.name }}<span v-if="hoverMarker.hint" class="marker-tip-hint">{{ hoverMarker.hint }}</span></span>
      </div>

      <!-- Kiosk-only top-center bar, fixed just below the thumbnail strip:
           the "take it home" QR pill (a QR of the public URL so a guest can
           keep exploring on their phone) and, while in 3D, the "View in 2D"
           control (moved here from under the description panel). -->
      <div v-if="kioskMode" class="kiosk-top-bar">
        <button class="kiosk-home-btn" @click="showHomeQR">
          <font-awesome-icon icon="globe" /> Take it with you
        </button>
      </div>

      <!-- Bottom-left credits/logos (left side stays clear of the right-hand
           gallery, which can run down the screen and overlap a bottom-right logo). -->
      <div class="bottom-logos">
        <a href="https://www.cosmicds.cfa.harvard.edu/" target="_blank" rel="noopener noreferrer">
          <img alt="CosmicDS" src="./assets/logo_cosmicds.png" />
        </a>
        <a href="https://worldwidetelescope.org/home/" target="_blank" rel="noopener noreferrer">
          <img alt="WWT" src="./assets/logo_wwt.png" />
        </a>
      </div>

      <!-- Staff-visible warning when the take-home QR would point somewhere a
           visitor's phone can't reach (audit J2). Set VUE_APP_PUBLIC_URL. -->
      <div v-if="kioskHomeUrlProblem" class="kiosk-staff-warning" role="status">
        <font-awesome-icon icon="triangle-exclamation" /> {{ kioskHomeUrlProblem }}
      </div>

      <!-- Attract-loop hint: pulsing "touch to explore" while auto-cycling. -->
      <div class="kiosk-hint" v-if="attractMode" aria-hidden="true">Touch to explore</div>

      <!-- Kiosk QR modal: shown instead of navigating away on any external
           link, and for the take-home QR. Nested here (not teleported) so the
           --accent-color CSS var resolves. -->
      <kiosk-qr-modal v-if="showQrModal" :url="qrUrl" :title="qrTitle" :type-url="qrTypeUrl" @close="closeQR" />
    </div>
  </v-app>
</template>

<script lang="ts">
import { defineComponent, markRaw } from "vue";
import { Folder, Place, ImageSetLayer, LayerManager, WWTControl } from "@wwtelescope/engine";
import { engineStore } from "@wwtelescope/engine-pinia";
import { applyImageSetLayerSetting } from "@wwtelescope/engine-helpers";
import { MiniDSBase, BackgroundImageset } from "@cosmicds/vue-toolkit";
// Side effect: sharper tiles (installs the RenderContext/WWTControl patch).
import "./tile-quality";
import { normalizeName, groupForName, LayerGroup } from "./layerTypes";
import { placeKey } from "./placeKey";
import KioskQrModal from "./KioskQrModal.vue";
import LayerPanel from "./LayerPanel.vue";
import LoadingOrion from "./LoadingOrion.vue";
import { layerSlug, parseLayersParam, formatLayersParam } from "./layerParam";
import {
  installKioskGuards, scheduleDailyReload, createIdleWatcher, IdleWatcher, isHttpUrl,
  KIOSK_RELOAD_HOUR, KIOSK_IDLE_MS, KIOSK_ATTRACT_DWELL_MS, KIOSK_ATTRACT_FALLBACK_STEP_MS,
} from "./kiosk";
import { urlWithoutParams, numberParam, stringParam } from "./urlParams";
import { statsInit, statsSessionStart, statsSessionEnd, statsTrack } from "./kioskStats";
import {
  withTimeout, fetchText, hasWebGL, describeBootError, scheduleKioskRetry, markBootSucceeded,
} from "./boot";
import { DEBUG } from "./debug";
import { CatalogOverlay, CatalogPoint, CatalogKind, CATALOG_STYLE } from "./catalog-renderer";
import proplydsData from "./data/proplyds.json";
import jumbosData from "./data/jumbos.json";

interface ImageMeta {
  description: string;
  credits: string;
  creditsUrl: string;
  imagesetName: string;
}

interface Proplyd { name: string; ra: number; dec: number; dark: boolean; cutout?: string; caption?: string }
interface Jumbo { name: string; ra: number; dec: number; massesMjup: number[]; sepAu: number }

// A catalog marker plus the data its info card shows.
type CatalogEntry = CatalogPoint & { proplyd?: Proplyd; jumbo?: Jumbo };

// Trimmed text of a direct child element by tag name, or "" if absent.
function directChildText(el: Element, tag: string): string {
  for (const child of Array.from(el.children)) {
    if (child.tagName === tag) { return child.textContent?.trim() ?? ""; }
  }
  return "";
}

// Parse descriptions/credits from the catalog WTML text (the engine drops
// ImageSet/Description). Keyed like placeKey.ts (`${name}::${url}`).
function parseWtmlMetadata(text: string): Record<string, ImageMeta> {
  const doc = new DOMParser().parseFromString(text, "text/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Image catalog is not valid XML");
  }
  const map: Record<string, ImageMeta> = {};
  doc.querySelectorAll("Place").forEach((placeEl) => {
    const name = placeEl.getAttribute("Name");
    if (!name) { return; }
    const imgEl = placeEl.querySelector("ImageSet");
    const isetUrl = imgEl?.getAttribute("Url") ?? "";
    const key = isetUrl ? `${name}::${isetUrl}` : name;
    map[key] = {
      description: directChildText(placeEl, "Description") || (imgEl ? directChildText(imgEl, "Description") : ""),
      credits: imgEl ? directChildText(imgEl, "Credits") : "",
      creditsUrl: imgEl ? directChildText(imgEl, "CreditsUrl") : "",
      imagesetName: imgEl?.getAttribute("Name") ?? "",
    };
  });
  return map;
}

// The 2023 catalog lists every tile and thumbnail URL as http:// (audit O5).
// The engine upgrades tile requests on https pages, but <img> thumbnails
// don't go through it, so upgrade the WWT asset hosts in the text up front.
function upgradeToHttps(text: string): string {
  return text.replace(
    /http:\/\/(data1\.wwtassets\.org|web\.wwtassets\.org|cdn\.worldwidetelescope\.org|www\.worldwidetelescope\.org|wwtfiles\.blob\.core\.windows\.net)/g,
    "https://$1",
  );
}

const D2R = Math.PI / 180;

// Fisher–Yates shuffle (returns a new array) for the kiosk attract loop.
function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Opening state of the layer stack: the images shown at full opacity, the
// rest at 0 (the 2023 app opened with all eleven at full opacity). WTML Place
// names, matched via normalizeName. The panel's Reset returns to this set.
// Wide context, infrared nebula, and the start image (the JuMBO survey) with
// nothing stacked over it, so the image the app opens on is the one you see.
const DEFAULT_SHOWN = [
  "Matt Harbison - HA-LRGB",
  "VISTA - Infrared",
  "JWST - NIRCam Short-wavelength",
];

const HARBISON = "Matt Harbison - HA-LRGB";
const VISTA = "VISTA - Infrared";

// Guided tour: from a backyard telescope's wide view down to Webb's close-up
// of the Orion Bar. Each stop is a scene: it flies to `name` and fades the
// stack to exactly the `show` images. Names are WTML Place names.
const TOUR_STOPS: { name: string; show: string[]; caption: string }[] = [
  { name: HARBISON, show: [HARBISON],
    caption: "Orion's Sword through a backyard telescope. The Orion Nebula is the bright cloud at its heart, a star nursery about 1,350 light-years away." },
  { name: "ESO/VST - Optical", show: [HARBISON, "ESO/VST - Optical"],
    caption: "In visible light, glowing hydrogen and dust surround the young cluster at the nebula's centre." },
  { name: VISTA, show: [HARBISON, VISTA],
    caption: "Infrared light passes through dust, so ESO's VISTA telescope sees thousands of young stars that visible light hides." },
  { name: "HAWK-I - Infrared", show: [HARBISON, VISTA, "HAWK-I - Infrared"],
    caption: "A deep infrared look from the Very Large Telescope, used to count faint brown dwarfs and planet-mass objects in the cluster." },
  { name: "Hubble - Optical", show: [HARBISON, VISTA, "Hubble - Optical"],
    caption: "Hubble's view of the Orion Bar: a wall of gas being worn away by ultraviolet light from the hot Trapezium stars." },
  { name: "JWST - NIRCam Long-wavelength", show: [HARBISON, VISTA, "JWST - NIRCam Long-wavelength"],
    caption: "Webb's longer near-infrared wavelengths trace warm dust and molecules across the inner nebula." },
  { name: "JWST - NIRCam Short-wavelength", show: [HARBISON, VISTA, "JWST - NIRCam Short-wavelength"],
    caption: "Webb's sharpest near-infrared view. Turn on the JuMBO markers to find pairs of planet-mass objects floating free in the cluster." },
  { name: "JWST - NIRCam", show: [HARBISON, VISTA, "Hubble - Optical", "JWST - NIRCam"],
    caption: "Close in on the Orion Bar, where the Trapezium's radiation eats into the molecular cloud. Hubble's visible-light view frames Webb's." },
  { name: "JWST - MIRI", show: [HARBISON, VISTA, "JWST - NIRCam", "JWST - MIRI"],
    caption: "Webb's mid-infrared MIRI camera sees glowing carbon-rich molecules along the edge of the Orion Bar." },
];

// One in-flight opacity animation across any number of layers. Times are ms
// from `start`; opacities are 0–1 except toPct (the slider value it lands on).
interface LayerFade { from: number; to: number; toPct: number; t0: number; t1: number }
interface FadeAnim { start: number; total: number; fades: Record<string, LayerFade> }

// What visitors are looking at when they open a marker (audit O12).
const KIND_INTRO: Record<CatalogKind, string> = {
  proplyd: "A proplyd (protoplanetary disk) is a young star wrapped in a disk of gas and dust that may one day form planets. "
    + "Ultraviolet light from the hot Trapezium stars evaporates these disks, giving bright proplyds comet-like tails; "
    + "dark proplyds are seen in silhouette against the glowing nebula.",
  jumbo: "JuMBOs (Jupiter-Mass Binary Objects) are pairs of planet-mass objects that Webb found floating free in the nebula, "
    + "not orbiting any star (Pearson & McCaughrean 2023). How they formed is an open question, and follow-up studies "
    + "suggest some candidates may be background sources.",
};

const KIND_LINK: Record<CatalogKind, { url: string; label: string }> = {
  proplyd: { url: "https://arxiv.org/abs/astro-ph/0506650", label: "Proplyds publication" },
  jumbo: { url: "https://arxiv.org/abs/2310.01231", label: "JuMBOs publication" },
};

const FADE_FLOOR = 0.02;
const MIN_SLEW_MS = 2500;
const MAX_SLEW_MS = 6000;
const REDUCED_MOTION_FADE_MS = 400;
// Panel actions (eye, Solo, All/None/Reset, group chips) fade this fast.
const QUICK_FADE_MS = 350;
const IS_COARSE_POINTER = window.matchMedia("(pointer: coarse)").matches;

// Background sky surveys, ordered high-energy → infrared (audit O10: loaded
// once, and DSS is back so a visitor can return to the optical sky).
const SKY_SURVEYS: [string, string][] = [
  ["Fermi (Gamma)", "Fermi LAT 8-year (gamma)"],
  ["ROSAT (X-ray)", "RASS: ROSAT All Sky Survey (X-ray)"],
  ["GALEX (Ultraviolet)", "GALEX (Ultraviolet)"],
  ["Digitized Sky Survey (Optical)", "Digitized Sky Survey"],
  ["NASA Deep Star Maps (Optical)", "Deep Star Maps 2020"],
  ["Gaia DR2 (Optical)", "Gaia DR2"],
  ["PanSTARRS1 3pi (Optical)", "PanSTARRS1 3pi"],
  ["unWISE (Infrared)", "unWISE color, from W2 and W1 bands"],
  ["WISE All Sky (Infrared)", "WISE All Sky (Infrared)"],
  ["2MASS (Infrared)", "2Mass: Imagery (Infrared)"],
  ["SFD Dust Map (Infrared)", "SFD Dust Map (Infrared)"],
];

export default defineComponent({
  extends: MiniDSBase,
  name: "OrionViewer",

  components: { "kiosk-qr-modal": KioskQrModal, "layer-panel": LayerPanel, "loading-orion": LoadingOrion },

  props: {
    wwtNamespace: { type: String, required: true },
    wtml: { type: String, required: true },
    bgWtml: { type: String, required: true },
    bgName: { type: String, required: true },
    introTitle: { type: String, default: "Explore the Orion Nebula" },
    startImage: { type: String, default: "" },
    startZoomDeg: { type: Number, default: 30 },
    kioskMode: { type: Boolean, default: false },
    kioskHomeUrl: { type: String, default: "" },
  },

  data() {
    return {
      imagesetFolder: null as Folder | null,
      places: [] as Place[],
      backgroundImagesets: [] as BackgroundImageset[],
      metaByName: {} as Record<string, ImageMeta>,

      selectedPlace: null as Place | null,
      layersLoaded: false,
      positionSet: false,
      metadataLoaded: false,
      bgSurveyLoaded: false,
      stackReady: false,
      hasFlownToStart: false,

      // The layer stack: one ImageSetLayer per Place, all on the sky at once
      // (as in 2023), widest at the bottom. Added once at boot, never deleted.
      // `opacities` is the panel's slider state in percent; `liveOpacity` is
      // what the engine has (0–1, mid-fade values included). The raw maps are
      // markRaw so Vue never proxies an engine object.
      stack: [] as Place[],
      layerByKey: markRaw({}) as Record<string, ImageSetLayer>,
      liveOpacity: markRaw({}) as Record<string, number>,
      lastShown: markRaw({}) as Record<string, number>,
      opacities: {} as Record<string, number>,
      anim: null as FadeAnim | null,

      showIntro: true,
      showQrModal: false,
      qrUrl: "",
      qrTitle: "",
      qrTypeUrl: "",
      kioskCleanups: [] as Array<() => void>,
      attractMode: false,
      attractTimer: 0,
      attractOrder: [] as Place[],
      attractIdx: 0,
      lastSlewMs: 0,
      kioskIdleWatcher: null as IdleWatcher | null,
      introTriggerEl: null as HTMLElement | null,
      isMenuOpen: false,
      showSurveyMenu: false,
      showDescription: true,

      accentColor: "#F0AB52",
      accentColor2: "#99c8ff",

      fadeRaf: 0,
      positionSetTimer: 0,

      // Catalog markers (audit O7, O12).
      showProplyds: true,
      showJumbos: true,
      catalogEntries: [] as CatalogEntry[],
      selectedMarker: null as CatalogEntry | null,
      hoverMarker: { show: false, name: "", hint: "", x: 0, y: 0 },
      pendingTapName: "",
      pointerDownAt: null as { x: number; y: number } | null,
      hoverRaf: 0,
      pendingHoverEvent: null as PointerEvent | null,

      bootError: "",
      bootRetryable: true,
      bootRetryInS: 0,

      deepLinkImage: stringParam("image") ?? "",
      // ?layers= at load (slug → percent); null when absent. Wins over the
      // opening set, and the start fly-in then leaves the stack alone.
      urlLayers: markRaw(parseLayersParam(stringParam("layers")) ?? new Map<string, number>()),
      layersFromUrl: parseLayersParam(stringParam("layers")) !== null,
      urlSyncTimer: 0,
      shareStatus: "",

      tourActive: false,
      tourIdx: 0,

      liveMessage: "",
      dockObserver: null as ResizeObserver | null,
      // Held raw (markRaw) so Vue never proxies the canvas or the callback.
      overlay: null as CatalogOverlay | null,
      frameCallback: null as (() => void) | null,
    };
  },

  mounted() {
    this.backgroundImagesets = SKY_SURVEYS.map(([display, name]) => new BackgroundImageset(display, name));
    this.catalogEntries = markRaw([
      ...(proplydsData as Proplyd[]).map((p) => markRaw({ kind: "proplyd" as const, name: p.name, ra: p.ra, dec: p.dec, proplyd: p })),
      ...(jumbosData as Jumbo[]).map((j) => markRaw({ kind: "jumbo" as const, name: j.name, ra: j.ra, dec: j.dec, jumbo: j })),
    ]);

    this.focusIntroClose();
    window.addEventListener("keydown", this.onGlobalKeydown);
    window.addEventListener("pointerdown", this.onGlobalPointerdown);

    if (this.kioskMode) {
      this.showIntro = false;
      statsInit(this.kioskMode);
      this.kioskCleanups.push(installKioskGuards({
        onExternalLink: (url, title) => this.showQR(url, title),
      }));
      this.kioskCleanups.push(scheduleDailyReload(KIOSK_RELOAD_HOUR, () => this.attractMode));
      const idleOverrideS = numberParam("kioskIdle");
      const idleMs = (idleOverrideS !== null && idleOverrideS > 0) ? idleOverrideS * 1000 : KIOSK_IDLE_MS;
      const watcher = createIdleWatcher({
        idleMs,
        onIdle: () => this.enterAttract(),
        onActive: () => this.onKioskActivity(),
        onTap: () => statsTrack("tap"),
      });
      watcher.start();
      this.kioskIdleWatcher = watcher;
      this.kioskCleanups.push(() => watcher.stop());

      // Measure the top thumbnail strip rather than assuming its height.
      const root = this.$el as HTMLElement;
      const strip = root.querySelector(".gallery-wrap");
      const main = root.querySelector("#main-content") as HTMLElement | null;
      if (strip && main && "ResizeObserver" in window) {
        const ro = new ResizeObserver(() => {
          main.style.setProperty("--kiosk-strip-h", `${strip.getBoundingClientRect().height}px`);
        });
        ro.observe(strip);
        this.kioskCleanups.push(() => ro.disconnect());
      }
    }

    this.boot();

    const gallery = (this.$el as HTMLElement).querySelector(".gallery-wrap");
    if (gallery && "ResizeObserver" in window) {
      this.dockObserver = new ResizeObserver(() => this.layoutDock());
      this.dockObserver.observe(gallery);
    }
    window.addEventListener("resize", this.layoutDock);
    this.$nextTick(() => this.layoutDock());
  },

  beforeUnmount() {
    this.cancelFade();
    if (this.hoverRaf) { cancelAnimationFrame(this.hoverRaf); }
    window.clearTimeout(this.attractTimer);
    for (const fn of this.kioskCleanups) { fn(); }
    this.kioskCleanups = [];
    window.removeEventListener("keydown", this.onGlobalKeydown);
    window.removeEventListener("pointerdown", this.onGlobalPointerdown);
    window.removeEventListener("resize", this.layoutDock);
    this.dockObserver?.disconnect();
    window.clearTimeout(this.positionSetTimer);
    window.clearTimeout(this.urlSyncTimer);
    if (this.frameCallback) {
      try { engineStore().removeFrameCallback(this.frameCallback); } catch { /* engine already gone */ }
    }
    this.overlay?.destroy();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).orionApp;
  },

  computed: {
    isLoading(): boolean {
      return !this.ready && !this.bootError;
    },
    ready(): boolean {
      return this.layersLoaded && this.positionSet && this.metadataLoaded
        && this.bgSurveyLoaded && this.stackReady;
    },
    loadingStatus(): string {
      if (!this.layersLoaded) { return "Loading imagery catalog…"; }
      if (!this.metadataLoaded) { return "Loading image details…"; }
      if (!this.bgSurveyLoaded) { return "Loading sky surveys…"; }
      if (!this.stackReady) { return "Placing the images on the sky…"; }
      if (!this.positionSet) { return "Finishing up…"; }
      return "Loading…";
    },
    selectedName(): string {
      return this.selectedPlace ? this.selectedPlace.get_name() : "";
    },
    selectedKey(): string {
      return this.selectedPlace ? placeKey(this.selectedPlace) : "";
    },
    // ?layers= value for the current stack, or "" when it is the opening set
    // (so a plain link stays plain).
    layersParam(): string {
      if (!this.stackReady) { return ""; }
      const entries = this.panelPlaces.map((p): [string, number] => [p.get_name(), this.opacities[placeKey(p)] ?? 0]);
      const value = formatLayersParam(entries);
      const defaults = this.defaultTargets();
      const isDefault = this.stack.every((p) => (this.opacities[placeKey(p)] ?? 0) === defaults[placeKey(p)]);
      return isDefault ? "" : value;
    },
    // The panel lists the stack top first, like an image editor's layers.
    panelPlaces(): Place[] {
      return this.stack.slice().reverse();
    },
    startPlace(): Place | null {
      if (this.places.length === 0) { return null; }
      for (const wanted of [this.deepLinkImage, this.startImage]) {
        if (!wanted) { continue; }
        const match = this.placeByName(wanted);
        if (match) { return match; }
        console.warn(`Image "${wanted}" not found in collection.`);
      }
      return this.places[0];
    },
    tourPlaces(): { place: Place; show: string[]; caption: string }[] {
      const out: { place: Place; show: string[]; caption: string }[] = [];
      for (const stop of TOUR_STOPS) {
        const place = this.placeByName(stop.name);
        if (place) { out.push({ place, show: stop.show, caption: stop.caption }); }
      }
      return out;
    },
    tourCaption(): string {
      return this.tourActive ? (this.tourPlaces[this.tourIdx]?.caption ?? "") : "";
    },
    safeCreditsUrl(): string {
      const u = this.currentMeta.creditsUrl;
      return u && isHttpUrl(u) ? u : "";
    },
    canvasLabel(): string {
      return this.selectedName ? `Sky view of the Orion Nebula showing: ${this.selectedName}` : "Sky view of the Orion Nebula";
    },
    homeTypeUrl(): string {
      const base = this.kioskHomeUrl
        || urlWithoutParams("kiosk", "kioskIdle", "kioskStats", "tileq", "image", "markers", "layers", "debug");
      try {
        const u = new URL(base);
        return (u.host + u.pathname).replace(/\/$/, "");
      } catch {
        return base;
      }
    },
    kioskHomeUrlProblem(): string {
      if (!this.kioskMode) { return ""; }
      let u: URL;
      try { u = new URL(this.homeUrl); } catch { return "Take-home QR URL is invalid"; }
      if (u.protocol !== "https:") { return "Take-home QR URL is not https"; }
      if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname)) {
        return "Take-home QR URL points at this machine or the local network";
      }
      return "";
    },
    currentMeta(): ImageMeta {
      return this.metaByName[this.selectedKey] ?? { description: "", credits: "", creditsUrl: "", imagesetName: "" };
    },
    // The imageset's own title, shown under the gallery label when it adds
    // something (e.g. "Long-wavelength NIRCam Orion Nebula").
    imageSubtitle(): string {
      const t = this.currentMeta.imagesetName.replace(/\*$/, "");
      return t && normalizeName(t) !== normalizeName(this.selectedName) ? t : "";
    },
    markerTitle(): string {
      const m = this.selectedMarker;
      if (!m) { return ""; }
      return m.kind === "jumbo" ? m.name : `Proplyd ${m.name}`;
    },
    markerKindLabel(): string {
      const m = this.selectedMarker;
      if (!m) { return ""; }
      if (m.kind === "jumbo") { return "Jupiter-mass binary object"; }
      return m.proplyd?.dark ? "Dark proplyd (seen in silhouette)" : "Proplyd (protoplanetary disk)";
    },
    markerDetail(): string {
      const j = this.selectedMarker?.jumbo;
      if (!j) { return ""; }
      const masses = j.massesMjup.map((m) => `~${m}`);
      const list = masses.length === 2 ? `${masses[0]} and ${masses[1]}` : `${masses.slice(0, -1).join(", ")} and ${masses[masses.length - 1]}`;
      const kind = masses.length === 3 ? "Three objects" : "Two objects";
      return `${kind} of ${list} Jupiter masses, about ${Math.round(j.sepAu)} au apart as seen from Earth.`;
    },
    markerIntro(): string {
      return this.selectedMarker ? KIND_INTRO[this.selectedMarker.kind] : "";
    },
    markerLink(): { url: string; label: string } | null {
      return this.selectedMarker ? KIND_LINK[this.selectedMarker.kind] : null;
    },
    proplydColor(): string { return CATALOG_STYLE.proplyd.color; },
    jumboColor(): string { return CATALOG_STYLE.jumbo.color; },
    cssVars(): Record<string, string> {
      return {
        "--accent-color": this.accentColor,
        "--accent-color2": this.accentColor2,
        "--proplyd-color": CATALOG_STYLE.proplyd.color,
        "--jumbo-color": CATALOG_STYLE.jumbo.color,
        "--app-content-height": "100%",
      };
    },
    homeUrl(): string {
      const base = this.kioskHomeUrl
        || urlWithoutParams("kiosk", "kioskIdle", "kioskStats", "tileq", "image", "markers", "layers", "debug");
      const params = new URLSearchParams();
      if (this.selectedPlace && !this.attractMode) { params.set("image", this.selectedName); }
      if (this.layersParam && !this.attractMode) { params.set("layers", this.layersParam); }
      params.set("utm_source", "kiosk");
      return base + (base.includes("?") ? "&" : "?") + params.toString();
    },
    curBackgroundImagesetName: {
      get(): string {
        return this.wwtBackgroundImageset?.get_name() ?? "";
      },
      set(name: string) {
        this.setBackgroundImageByName(name);
      },
    },
  },

  watch: {
    ready(isReady: boolean): void {
      if (!isReady) { return; }
      markBootSucceeded();
      this.labelCanvas();
      if (this.kioskHomeUrlProblem) { console.warn(`[orion] kiosk: ${this.kioskHomeUrlProblem} (${this.homeUrl})`); }
    },
    canvasLabel(): void {
      this.labelCanvas();
    },
    selectedKey(): void {
      this.syncUrl();
      const body = this.$refs.descBody as HTMLElement | undefined;
      if (body) { body.scrollTop = 0; }
    },
    showProplyds(on: boolean): void {
      this.overlay?.setVisible("proplyd", on);
      if (!on && this.selectedMarker?.kind === "proplyd") { this.closeMarkerCard(); }
      this.syncUrl();
    },
    // Opacities change every frame during a fade; write the URL once things
    // settle.
    layersParam(): void {
      window.clearTimeout(this.urlSyncTimer);
      this.urlSyncTimer = window.setTimeout(() => this.syncUrl(), 400);
    },
    showJumbos(on: boolean): void {
      this.overlay?.setVisible("jumbo", on);
      if (!on && this.selectedMarker?.kind === "jumbo") { this.closeMarkerCard(); }
      this.syncUrl();
    },
  },

  methods: {
    placeKey,

    extractPlaces(folder: Folder): Place[] {
      return markRaw(this.collectPlaces(folder).map((p) => markRaw(p)));
    },

    collectPlaces(folder: Folder): Place[] {
      const out: Place[] = [];
      for (const child of folder.get_children() ?? []) {
        if (child instanceof Place) {
          const iset = child.get_studyImageset() ?? child.get_backgroundImageset();
          if (iset !== null) { out.push(child); }
        } else if (child instanceof Folder) {
          out.push(...this.collectPlaces(child));
        }
      }
      return out;
    },

    placeByName(name: string): Place | null {
      const n = normalizeName(name);
      return this.places.find((p) => normalizeName(p.get_name()) === n) ?? null;
    },

    // Keep the bottom dock clear of the gallery at every size (see JWST app).
    layoutDock(): void {
      const root = this.$el as HTMLElement | undefined;
      const main = root?.querySelector?.("#main-content") as HTMLElement | null;
      const gallery = root?.querySelector?.(".gallery-wrap") as HTMLElement | null;
      const controls = root?.querySelector?.(".top-left-controls") as HTMLElement | null;
      if (!main || !gallery || !controls) { return; }
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const gap = 12;
      const g = gallery.getBoundingClientRect();
      let left = 16;
      let right = 16;
      let top: number;
      if (this.kioskMode) {
        const bar = root?.querySelector?.(".kiosk-top-bar") as HTMLElement | null;
        top = Math.max(g.bottom, bar ? bar.getBoundingClientRect().bottom : 0, controls.getBoundingClientRect().bottom);
      } else if (vw > 600) {
        right = vw - g.left + gap;
        top = controls.getBoundingClientRect().bottom;
      } else {
        left = right = 8;
        top = Math.max(g.bottom, controls.getBoundingClientRect().bottom);
      }
      main.style.setProperty("--dock-left", `${left}px`);
      main.style.setProperty("--dock-right", `${Math.max(left, right)}px`);
      main.style.setProperty("--dock-max-h", `${Math.max(120, vh - top - gap - 12)}px`);
    },

    labelCanvas(): void {
      const canvas = (this.$el as HTMLElement | undefined)?.querySelector?.(".wwtelescope-component canvas, canvas:not(.catalog-overlay)");
      if (!canvas) { return; }
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", this.canvasLabel);
    },

    // ?image=<name> and ?markers=proplyds,jumbos|none, kept in sync while
    // browsing (not in kiosk mode, whose URL must survive the nightly reload).
    syncUrl(): void {
      if (this.kioskMode || !this.ready) { return; }
      const params = new URLSearchParams(window.location.search);
      if (this.selectedPlace) { params.set("image", this.selectedName); } else { params.delete("image"); }
      const markers = [this.showProplyds ? "proplyds" : "", this.showJumbos ? "jumbos" : ""].filter(Boolean);
      if (markers.length === 2) { params.delete("markers"); } else { params.set("markers", markers.join(",") || "none"); }
      if (this.layersParam) { params.set("layers", this.layersParam); } else { params.delete("layers"); }
      const qs = params.toString();
      const url = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
      try { window.history.replaceState(null, "", url); } catch { /* sandboxed iframe */ }
    },

    async shareView(): Promise<void> {
      const url = window.location.href;
      const title = this.selectedName ? `${this.selectedName} · Orion Nebula` : "Orion Nebula";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      try {
        if (IS_COARSE_POINTER && typeof nav.share === "function") {
          await nav.share({ title, url });
          return;
        }
        await navigator.clipboard.writeText(url);
        this.shareStatus = "Link copied";
      } catch {
        this.shareStatus = "Couldn't copy the link";
      }
      this.announce(this.shareStatus);
      window.setTimeout(() => { this.shareStatus = ""; }, 2500);
    },

    announce(msg: string): void {
      this.liveMessage = "";
      this.$nextTick(() => { this.liveMessage = msg; });
    },

    // Startup (audit E3/O4). Every stage is time-boxed and a failure shows the
    // error card. The catalog is fetched once: its text feeds the description
    // parser and, via a blob: URL, the engine's folder loader.
    async boot(): Promise<void> {
      if (!hasWebGL()) {
        this.bootError = "This browser can't display WebGL graphics, which WorldWide Telescope needs. "
          + "Try an up-to-date version of Chrome, Edge, Firefox or Safari.";
        this.bootRetryable = false;
        return;
      }
      try {
        await withTimeout(this.waitForReady(), "Starting the sky viewer", 30_000);
        this.setClockSync(false);
        if (DEBUG) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).orionApp = this;
        }

        withTimeout(this.loadImageCollection({ url: this.bgWtml, loadChildFolders: true }), "Loading sky surveys")
          .then(() => { this.curBackgroundImagesetName = this.bgName; })
          .catch((err) => { console.warn("[orion] sky surveys failed to load; keeping the default background", err); })
          .finally(() => { this.bgSurveyLoaded = true; });

        const text = upgradeToHttps(await withTimeout(fetchText(this.wtml), "Loading the image catalog"));
        this.metaByName = parseWtmlMetadata(text);
        this.metadataLoaded = true;

        const blobUrl = URL.createObjectURL(new Blob([text], { type: "text/xml" }));
        let folder: Folder;
        try {
          folder = await withTimeout(
            this.loadImageCollection({ url: blobUrl, loadChildFolders: true }), "Reading the image catalog");
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
        this.imagesetFolder = markRaw(folder);
        this.places = this.extractPlaces(folder);
        this.layersLoaded = true;

        await withTimeout(this.buildStack(), "Placing the images on the sky", 30_000);

        this.installCatalogOverlay();

        if (this.places.length > 0) {
          this.frameStart();
          this.maybeFlyToStart();
        }
        this.positionSetTimer = window.setTimeout(() => { this.positionSet = true; }, 150);
      } catch (err) {
        console.error("[orion] startup failed", err);
        this.bootError = describeBootError(err);
        if (this.kioskMode) {
          this.bootRetryInS = Math.round(scheduleKioskRetry() / 1000);
        }
      }
    },

    retryBoot(): void {
      window.location.reload();
    },

    // ── Catalog markers (audit O7) ─────────────────────────────────────────
    installCatalogOverlay(): void {
      const host = (this.$el as HTMLElement).querySelector("#main-content") as HTMLElement | null;
      if (!host) { return; }
      const markers = stringParam("markers");
      if (markers !== null) {
        const on = new Set(markers.split(","));
        this.showProplyds = on.has("proplyds");
        this.showJumbos = on.has("jumbos");
      }
      const overlay = new CatalogOverlay(host);
      overlay.setPoints(this.catalogEntries);
      overlay.setVisible("proplyd", this.showProplyds);
      overlay.setVisible("jumbo", this.showJumbos);
      this.overlay = markRaw(overlay);
      // vue-toolkit 0.2's MiniDSBase predates addFrameCallback (engine-pinia
      // 0.15), so call the store directly.
      const cb = (): void => this.drawOverlay();
      this.frameCallback = markRaw(cb);
      engineStore().addFrameCallback(cb);
    },

    drawOverlay(): void {
      const overlay = this.overlay;
      if (!overlay) { return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rc = (WWTControl.singleton as any)?.renderContext;
      const fovDeg = rc?.get_fovAngle?.() ?? this.wwtZoomDeg / 6;
      overlay.draw(
        (ra, dec) => {
          try { return this.findScreenPointForRADec({ ra, dec }); } catch { return null; }
        },
        { raRad: this.wwtRARad, decRad: this.wwtDecRad },
        fovDeg,
      );
    },

    onViewerPointerDown(ev: PointerEvent): void {
      if (!(ev.target instanceof HTMLCanvasElement)) { return; }
      this.pointerDownAt = { x: ev.clientX, y: ev.clientY };
    },

    onViewerPointerMove(ev: PointerEvent): void {
      if (ev.pointerType !== "mouse") { return; }
      if (!(ev.target instanceof HTMLCanvasElement)) { this.hoverMarker.show = false; return; }
      this.pendingHoverEvent = ev;
      if (this.hoverRaf) { return; }
      this.hoverRaf = requestAnimationFrame(() => {
        this.hoverRaf = 0;
        const e = this.pendingHoverEvent;
        this.pendingHoverEvent = null;
        if (!e) { return; }
        const hit = this.overlay?.hitTest(e.offsetX, e.offsetY, 14) ?? null;
        if (hit) { this.showMarkerLabel(hit as CatalogEntry, ""); } else { this.hoverMarker.show = false; }
      });
    },

    onViewerPointerUp(ev: PointerEvent): void {
      if (!(ev.target instanceof HTMLCanvasElement)) { return; }
      const start = this.pointerDownAt;
      this.pointerDownAt = null;
      if (start && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 6) { return; }
      const touch = ev.pointerType === "touch" || ev.pointerType === "pen";
      const hit = (this.overlay?.hitTest(ev.offsetX, ev.offsetY, touch ? 24 : 18) ?? null) as CatalogEntry | null;
      if (!hit) {
        this.hoverMarker.show = false;
        this.pendingTapName = "";
        return;
      }
      if (touch && this.pendingTapName !== hit.name) {
        // First tap previews, so a mis-tap in a crowded field costs nothing.
        this.pendingTapName = hit.name;
        this.showMarkerLabel(hit, "Tap again for details");
        return;
      }
      this.pendingTapName = "";
      this.openMarkerCard(hit);
    },

    showMarkerLabel(entry: CatalogEntry, hint: string): void {
      const pos = this.overlay?.screenPosition(entry);
      if (!pos) { return; }
      const h = this.hoverMarker;
      h.name = entry.kind === "jumbo" ? entry.name : `Proplyd ${entry.name}`;
      h.hint = hint;
      h.x = pos.x;
      h.y = pos.y;
      h.show = true;
    },

    openMarkerCard(entry: CatalogEntry): void {
      this.selectedMarker = markRaw(entry);
      this.overlay?.setHighlight(entry);
      this.hoverMarker.show = false;
      this.showSurveyMenu = false;
      statsTrack("marker", entry.name);
      this.announce(`${this.markerTitle}: ${this.markerKindLabel}`);
    },

    closeMarkerCard(): void {
      this.selectedMarker = null;
      this.overlay?.setHighlight(null);
    },

    toggleCatalog(kind: CatalogKind): void {
      if (kind === "proplyd") { this.showProplyds = !this.showProplyds; } else { this.showJumbos = !this.showJumbos; }
    },

    // ── Imagery ────────────────────────────────────────────────────────────
    placeCenter(place: Place): { raRad: number; decRad: number } {
      const iset = place.get_studyImageset() ?? place.get_backgroundImageset();
      return {
        raRad: iset ? D2R * iset.get_centerX() : place.get_RA() * 15 * D2R,
        decRad: iset ? D2R * iset.get_centerY() : place.get_dec() * D2R,
      };
    },

    frameStart(): void {
      if (!this.startPlace) { return; }
      const { raRad, decRad } = this.placeCenter(this.startPlace);
      this.gotoRADecZoom({ raRad, decRad, zoomDeg: this.startZoomDeg, instant: true });
    },

    maybeFlyToStart(): void {
      if (this.hasFlownToStart || this.showIntro || !this.startPlace) { return; }
      this.hasFlownToStart = true;
      // A ?layers= link already says what is visible; don't add the start image.
      this.onSelectPlace(this.startPlace, this.layersFromUrl ? {} : undefined);
    },

    // ── Layer stack ────────────────────────────────────────────────────────
    // Add every Place as an ImageSetLayer, widest first, so each later (smaller,
    // sharper) image draws on top: the 2023 nesting, but ordered by footprint
    // rather than by WTML order. Layers are added one at a time so the engine's
    // draw order is the stack order. A layer that fails to add is left out
    // with a console note rather than failing the boot (O4).
    async buildStack(): Promise<void> {
      const order = this.places
        .map((place, i) => ({ place, i }))
        // Ties: the later WTML entry goes lower, as in the 2023 app.
        .sort((a, b) => (b.place.get_zoomLevel() - a.place.get_zoomLevel()) || (b.i - a.i))
        .map((x) => x.place);
      const initial = this.layersFromUrl ? this.urlTargets(order) : this.defaultTargets(order);
      const stack: Place[] = [];
      for (const place of order) {
        const key = placeKey(place);
        const iset = place.get_studyImageset() ?? place.get_backgroundImageset();
        try {
          const layer = markRaw(await this.addImageSetLayer({
            url: iset?.get_url() ?? "",
            mode: "preloaded",
            name: place.get_name(),
            goto: false,
          }));
          this.layerByKey[key] = layer;
          stack.push(place);
          this.setOpacity(key, initial[key] ?? 0);
        } catch (err) {
          console.warn(`[orion] couldn't add the layer for "${place.get_name()}"`, err);
        }
      }
      this.stack = markRaw(stack);
      this.stackReady = true;
    },

    // Percent per layer for the opening set (DEFAULT_SHOWN at 100, rest 0).
    defaultTargets(places?: Place[]): Record<string, number> {
      const list = places ?? this.stack;
      const shown = new Set(DEFAULT_SHOWN.map(normalizeName));
      const out: Record<string, number> = {};
      for (const p of list) { out[placeKey(p)] = shown.has(normalizeName(p.get_name())) ? 100 : 0; }
      return out;
    },

    // Percent per layer from ?layers=; unknown slugs are reported and skipped.
    urlTargets(places: Place[]): Record<string, number> {
      const bySlug = new Map(places.map((p) => [layerSlug(p.get_name()), placeKey(p)]));
      for (const slug of this.urlLayers.keys()) {
        if (!bySlug.has(slug)) { console.warn(`[orion] ?layers=: no image called "${slug}"`); }
      }
      const out: Record<string, number> = {};
      for (const [slug, key] of bySlug) { out[key] = this.urlLayers.get(slug) ?? 0; }
      return out;
    },

    // Exactly these images at 100, everything else at 0.
    sceneTargets(names: string[]): Record<string, number> {
      const shown = new Set(names.map(normalizeName));
      const out: Record<string, number> = {};
      for (const p of this.stack) { out[placeKey(p)] = shown.has(normalizeName(p.get_name())) ? 100 : 0; }
      return out;
    },

    // What a hidden layer comes back at: its last visible opacity, else 100.
    restoreLevel(key: string): number {
      return this.lastShown[key] || 100;
    },

    applyLive(key: string, frac: number): void {
      const layer = this.layerByKey[key];
      if (!layer) { return; }
      this.liveOpacity[key] = frac;
      applyImageSetLayerSetting(layer, ["opacity", frac]);
      // LayerManager._draw gates on `enabled` only: an opacity-0 layer is still
      // drawn and still fetches its tiles. Disable hidden layers so they cost
      // nothing; FADE_FLOOR (> 0) re-enables a layer as it starts to fade in.
      const enabled = frac > 0;
      if (layer.get_enabled() !== enabled) { layer.set_enabled(enabled); }
    },

    // Set a layer's opacity now (percent), slider and engine together.
    setOpacity(key: string, pct: number): void {
      const v = Math.round(Math.min(100, Math.max(0, pct)));
      this.opacities[key] = v;
      if (v > 0) { this.lastShown[key] = v; }
      this.applyLive(key, v / 100);
    },

    // Fade layers to `targets` (percent). With slewMs, fades are anchored to
    // the camera slew: layers going out fade early, layers coming in fade over
    // the end of the slew and start at FADE_FLOOR so their tiles stream while
    // the camera moves (applyLive disables a layer at 0, so it fetches nothing).
    // Without it, a quick fade for panel actions. Fades still running from a
    // superseded animation carry on to their own targets.
    animateTo(targets: Record<string, number>, slewMs = 0): void {
      const merged: Record<string, number> = {};
      if (this.anim) {
        for (const [k, f] of Object.entries(this.anim.fades)) { merged[k] = f.toPct; }
      }
      Object.assign(merged, targets);
      this.cancelFade();

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const fades: Record<string, LayerFade> = {};
      let total = 0;
      for (const [key, toPct] of Object.entries(merged)) {
        if (!this.layerByKey[key]) { continue; }
        const from = this.liveOpacity[key] ?? 0;
        const to = toPct / 100;
        if (Math.abs(from - to) < 0.001) { this.setOpacity(key, toPct); continue; }
        let t0 = 0;
        let t1 = QUICK_FADE_MS;
        if (slewMs > 0) {
          if (to > from) {
            const inMs = Math.min(4000, Math.max(800, slewMs * 0.45));
            t0 = Math.max(0, slewMs - inMs);
            t1 = slewMs;
          } else {
            t1 = Math.min(3000, Math.max(600, slewMs * 0.3));
          }
        }
        let start = from;
        if (from === 0 && to > 0) {
          start = FADE_FLOOR;
          this.applyLive(key, FADE_FLOOR);
        }
        fades[key] = { from: start, to, toPct, t0, t1 };
        total = Math.max(total, t1);
      }

      if ((reduced && slewMs === 0) || Object.keys(fades).length === 0) {
        for (const [key, f] of Object.entries(fades)) { this.setOpacity(key, f.toPct); }
        return;
      }

      const anim: FadeAnim = markRaw({ start: performance.now(), total, fades });
      this.anim = anim;
      const smooth = (x: number) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };
      const tick = (now: number) => {
        if (this.anim !== anim) { return; }
        const el = now - anim.start;
        for (const [key, f] of Object.entries(anim.fades)) {
          if (el >= f.t1) { this.setOpacity(key, f.toPct); continue; }
          const v = f.from + (f.to - f.from) * smooth((el - f.t0) / (f.t1 - f.t0));
          this.applyLive(key, v);
          this.opacities[key] = Math.round(v * 100);
        }
        if (el < anim.total) {
          this.fadeRaf = requestAnimationFrame(tick);
        } else {
          this.fadeRaf = 0;
          this.anim = null;
        }
      };
      this.fadeRaf = requestAnimationFrame(tick);
    },

    // A hand on a slider wins over any fade running on that layer.
    dropFade(key: string): void {
      if (this.anim) { delete this.anim.fades[key]; }
    },

    onPanelOpacity(key: string, pct: number): void {
      this.dropFade(key);
      this.setOpacity(key, pct);
    },

    toggleLayer(key: string): void {
      this.dropFade(key);
      const on = (this.opacities[key] ?? 0) > 0;
      this.animateTo({ [key]: on ? 0 : this.restoreLevel(key) });
    },

    soloLayer(key: string): void {
      const targets: Record<string, number> = {};
      for (const p of this.stack) { targets[placeKey(p)] = 0; }
      targets[key] = (this.opacities[key] ?? 0) > 0 ? this.opacities[key] : this.restoreLevel(key);
      this.animateTo(targets);
      const place = this.stack.find((p) => placeKey(p) === key);
      if (place) { this.announce(`Showing only ${place.get_name()}`); }
    },

    applyPreset(kind: "default" | "all" | "none"): void {
      let targets: Record<string, number>;
      if (kind === "default") {
        targets = this.defaultTargets();
      } else {
        targets = {};
        for (const p of this.stack) { targets[placeKey(p)] = kind === "all" ? 100 : 0; }
      }
      this.animateTo(targets);
      this.announce(kind === "default" ? "Starting images shown" : kind === "all" ? "All images shown" : "All images hidden");
    },

    setGroupShown(group: LayerGroup, on: boolean): void {
      const targets: Record<string, number> = {};
      for (const p of this.stack) {
        if (groupForName(p.get_name()) !== group) { continue; }
        const key = placeKey(p);
        targets[key] = on ? this.restoreLevel(key) : 0;
      }
      this.animateTo(targets);
    },

    // Debug/test hook: the image layers' names in the engine's draw order
    // (bottom first).
    engineStackNames(): string[] {
      const map = LayerManager.get_allMaps()["Sky"];
      return (map?.layers ?? []).filter((l) => l instanceof ImageSetLayer).map((l) => l.get_name());
    },

    onPanelSelect(place: Place): void {
      if (this.tourActive) { this.stopTour(); }
      this.onSelectPlace(place);
    },

    // Fly to an image. By default it is also shown (faded in at its last
    // opacity) if it was hidden, and nothing else changes; `targets` instead
    // fades the whole stack to a scene over the slew (tour, attract loop).
    onSelectPlace(place: Place, targets?: Record<string, number>): void {
      if (!this.attractMode) { statsTrack("select", place.get_name()); }
      this.announce(place.get_name());

      this.selectedPlace = place;
      this.showDescription = true;
      this.showSurveyMenu = false;

      const key = placeKey(place);
      const { raRad, decRad } = this.placeCenter(place);
      const zoomDeg = place.get_zoomLevel();
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let slewMs: number;
      if (reducedMotion) {
        slewMs = REDUCED_MOTION_FADE_MS;
        this.gotoRADecZoom({ raRad, decRad, zoomDeg, instant: true }).catch(() => undefined);
      } else {
        const predictedMs = this.timeToRADecZoom({ raRad, decRad, zoomDeg, rollRad: 0 }) * 1000;
        slewMs = Math.min(MAX_SLEW_MS, Math.max(MIN_SLEW_MS, predictedMs));
        this.gotoRADecZoom({ raRad, decRad, zoomDeg, instant: false, duration: slewMs / 1000 }).catch(() => undefined);
      }
      this.lastSlewMs = slewMs;

      const scene = targets
        ?? ((this.opacities[key] ?? 0) === 0 ? { [key]: this.restoreLevel(key) } : {});
      this.animateTo(scene, slewMs);
    },

    cancelFade(): void {
      if (this.fadeRaf) {
        cancelAnimationFrame(this.fadeRaf);
        this.fadeRaf = 0;
      }
      this.anim = null;
    },

    // ── Menus, intro, keyboard ─────────────────────────────────────────────
    toggleMenu(): void {
      this.isMenuOpen = !this.isMenuOpen;
    },
    openIntro(): void {
      this.introTriggerEl = this.$refs.menuToggleBtn as HTMLElement | null;
      this.showIntro = true;
      this.isMenuOpen = false;
      this.focusIntroClose();
    },
    closeIntro(): void {
      this.showIntro = false;
      this.maybeFlyToStart();
      this.introTriggerEl?.focus();
      this.introTriggerEl = null;
    },
    focusIntroClose(): void {
      this.$nextTick(() => {
        (this.$refs.introModal as HTMLElement | undefined)?.focus();
      });
    },
    onIntroTabKey(ev: KeyboardEvent): void {
      const modal = this.$refs.introModal as HTMLElement | undefined;
      if (!modal) { return; }
      const focusables = modal.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) { return; }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (document.activeElement === modal) {
        ev.preventDefault();
        (ev.shiftKey ? last : first).focus();
        return;
      }
      if (ev.shiftKey && document.activeElement === first) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault();
        first.focus();
      }
    },
    stepImage(delta: 1 | -1): void {
      const list = this.panelPlaces;
      if (list.length === 0) { return; }
      const key = this.selectedKey;
      const idx = key ? list.findIndex((p) => placeKey(p) === key) : -1;
      const target = idx === -1
        ? (delta > 0 ? list[0] : list[list.length - 1])
        : list[(idx + delta + list.length) % list.length];
      this.onSelectPlace(target);
    },
    // Arrow keys step images (never while typing); Escape closes the topmost
    // overlay. No single-letter shortcuts (audit O6).
    onGlobalKeydown(ev: KeyboardEvent): void {
      if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
        if (this.showIntro || this.showQrModal) { return; }
        if (ev.repeat) { return; }
        const el = document.activeElement as HTMLElement | null;
        if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) { return; }
        ev.preventDefault();
        if (this.tourActive) { this.tourStep(ev.key === "ArrowRight" ? 1 : -1); } else { this.stepImage(ev.key === "ArrowRight" ? 1 : -1); }
        return;
      }
      if (ev.key !== "Escape") { return; }
      if (this.showQrModal) { this.closeQR(); return; }
      if (this.showIntro) { this.closeIntro(); }
      else if (this.isMenuOpen) { this.isMenuOpen = false; }
      else if (this.showSurveyMenu) { this.showSurveyMenu = false; }
      else if (this.selectedMarker) { this.closeMarkerCard(); }
      else if (this.tourActive) { this.stopTour(); }
    },
    onGlobalPointerdown(ev: PointerEvent): void {
      const target = ev.target as Node;
      if (this.isMenuOpen) {
        const controls = document.querySelector(".top-left-controls");
        if (controls && !controls.contains(target)) { this.isMenuOpen = false; }
      }
      if (this.showSurveyMenu) {
        const menu = document.querySelector(".survey-menu");
        if (menu && !menu.contains(target)) { this.showSurveyMenu = false; }
      }
    },
    toggleSurveyMenu(): void {
      this.showSurveyMenu = !this.showSurveyMenu;
      this.isMenuOpen = false;
      if (this.showSurveyMenu) {
        this.showDescription = false;
        this.$nextTick(() => {
          const menu = document.querySelector(".survey-menu");
          const target = menu?.querySelector<HTMLElement>(".survey-option.active")
            ?? menu?.querySelector<HTMLElement>(".survey-option");
          target?.focus();
        });
      }
    },
    selectSurvey(name: string): void {
      statsTrack("survey");
      this.curBackgroundImagesetName = name;
    },
    toggleFullscreen(): void {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn(`Fullscreen request failed: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    },
    openLink(url: string, label = ""): void {
      if (this.kioskMode) { this.showQR(url, label); this.isMenuOpen = false; return; }
      window.open(url, "_blank", "noopener");
      this.isMenuOpen = false;
    },
    showQR(url: string, title = "", typeUrl = ""): void {
      this.qrUrl = url;
      this.qrTitle = title;
      this.qrTypeUrl = typeUrl;
      this.showQrModal = true;
      this.isMenuOpen = false;
      this.showSurveyMenu = false;
      statsTrack("qr", url);
    },
    closeQR(): void { this.showQrModal = false; },
    showHomeQR(): void {
      this.showQR(this.homeUrl, "Take it with you", this.homeTypeUrl);
      statsTrack("takeHome");
    },

    // ── Guided tour ────────────────────────────────────────────────────────
    startTour(): void {
      this.isMenuOpen = false;
      if (this.tourPlaces.length === 0) { return; }
      if (this.showIntro) { this.showIntro = false; this.hasFlownToStart = true; }
      statsTrack("tour");
      this.tourActive = true;
      this.tourIdx = 0;
      this.goToTourStop();
    },
    tourStep(delta: 1 | -1): void {
      if (!this.tourActive) { return; }
      const next = this.tourIdx + delta;
      if (next < 0 || next >= this.tourPlaces.length) {
        if (next >= this.tourPlaces.length) { this.stopTour(); this.announce("Tour finished"); }
        return;
      }
      this.tourIdx = next;
      this.goToTourStop();
    },
    goToTourStop(): void {
      const stop = this.tourPlaces[this.tourIdx];
      if (!stop) { return; }
      this.closeMarkerCard();
      this.showDescription = true;
      this.onSelectPlace(stop.place, this.sceneTargets(stop.show));
      this.announce(`Tour stop ${this.tourIdx + 1} of ${this.tourPlaces.length}: ${stop.place.get_name()}`);
    },
    stopTour(): void {
      this.tourActive = false;
    },

    // ── Kiosk attract loop ─────────────────────────────────────────────────
    enterAttract(): void {
      statsSessionEnd(this.kioskIdleWatcher?.lastActivityTs() ?? Date.now());
      this.stopTour();
      this.resetKioskView();
      this.attractTimer = window.setTimeout(() => {
        this.attractMode = true;
        this.attractOrder = shuffled(this.stack);
        this.attractIdx = 0;
        this.attractNext();
      }, 3000);
    },
    resetKioskView(): void {
      this.closeQR();
      this.closeMarkerCard();
      this.isMenuOpen = false;
      this.showSurveyMenu = false;
      this.showDescription = true;
      this.setBackgroundImageByName(this.bgName);
      this.showProplyds = true;
      this.showJumbos = true;
      this.animateTo(this.defaultTargets());
    },
    // Each attract step is the opening set plus the image it flies to.
    attractNext(): void {
      if (!this.attractMode || this.attractOrder.length === 0) { return; }
      const place = this.attractOrder[this.attractIdx % this.attractOrder.length];
      this.attractIdx += 1;
      this.onSelectPlace(place, { ...this.defaultTargets(), [placeKey(place)]: 100 });
      const stepMs = (this.lastSlewMs || KIOSK_ATTRACT_FALLBACK_STEP_MS) + KIOSK_ATTRACT_DWELL_MS;
      this.attractTimer = window.setTimeout(() => this.attractNext(), stepMs);
    },
    stopAttract(): void {
      window.clearTimeout(this.attractTimer);
      this.attractMode = false;
    },
    onKioskActivity(): void {
      if (this.attractMode) { this.stopAttract(); }
      statsSessionStart();
    },
  },
});
</script>

<style scoped lang="less">
/* Kiosk only: no text selection anywhere (guests double-tapping /
   long-pressing descriptive text shouldn't paint blue highlights). On the web,
   visitors can copy descriptions, credits and names (audit J12). user-select
   isn't inherited, but descendants' `auto` resolves to the parent's used value,
   so this one rule covers every panel including child components. */
#main-content.kiosk {
  user-select: none;
  -webkit-user-select: none;
}

/* Kiosk layout: height of the top thumbnail strip (gallery header + filter
   chips + one row of 7.5rem thumbs). Everything that sits below the strip
   (controls, top bar, attract caption) offsets from this. This value is only
   the first-paint estimate; a ResizeObserver keeps it measured (J7). */
#main-content.kiosk {
  --kiosk-strip-h: 12.5rem;
}

/* Top-left controls */
.top-left-controls {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 12;
  display: flex;
  flex-wrap: wrap;
  max-width: 15rem;
  gap: 0.5rem;
  align-items: flex-start;
}

/* Proplyd / JuMBO toggles: the marker shape and colour double as the legend. */
.catalog-toggles {
  flex-basis: 100%;
  display: flex;
  gap: 0.4rem;
}
.catalog-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(4, 6, 24, 0.82);
  backdrop-filter: blur(6px);
  color: rgba(255, 255, 255, 0.75);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;

  svg {
    width: 0.95rem;
    height: 0.95rem;
    fill: none;
    stroke-width: 2.2;
    opacity: 0.45;
  }
  &.proplyd svg { stroke: var(--proplyd-color); }
  &.jumbo svg { stroke: var(--jumbo-color); }
  &.on {
    color: #fff;
    svg { opacity: 1; }
  }
  &.proplyd.on { border-color: var(--proplyd-color); }
  &.jumbo.on { border-color: var(--jumbo-color); }
  &:focus-visible {
    outline: 2px solid var(--accent-color2);
    outline-offset: 2px;
  }
}

/* Marker info card (shares the description panel's frame). */
.marker-card-shape {
  flex: 0 0 auto;
  svg {
    width: 1.4rem;
    height: 1.4rem;
    fill: none;
    stroke-width: 2.2;
  }
  &.proplyd svg { stroke: var(--proplyd-color); }
  &.jumbo svg { stroke: var(--jumbo-color); }
}
.marker-cutout {
  float: right;
  width: 8rem;
  margin: 0 0 0.5rem 0.75rem;
  img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 6px;
    border: 1px solid var(--proplyd-color);
  }
  figcaption {
    margin-top: 0.3rem;
    font-size: 0.72rem;
    line-height: 1.3;
    color: rgba(255, 255, 255, 0.75);
  }
}
.marker-detail {
  color: #fff;
  font-weight: 600;
}

/* Kiosk: the thumbnail strip owns the top edge, so the control cluster drops
   just below it. */
.kiosk .top-left-controls {
  top: calc(var(--kiosk-strip-h) + 0.6rem);
}

.control-btn {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 8px;
  background: rgba(4, 6, 24, 0.82);
  backdrop-filter: blur(6px);
  border: 1px solid var(--accent-color);
  color: var(--accent-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  transition: box-shadow 150ms ease, color 150ms ease;

  &:hover {
    color: var(--accent-color2);
    box-shadow: 0 0 8px var(--accent-color);
  }
}

/* Startup error card (audit E3). */
.boot-error {
  max-width: min(32rem, 88vw);
  padding: 1.5rem 1.75rem;
  text-align: center;
  background: rgba(4, 6, 24, 0.92);
  border: 1px solid var(--accent-color);
  border-radius: 12px;
  color: #eaeaea;
  font-size: 1rem;
  line-height: 1.45;

  .boot-error-title {
    color: var(--accent-color);
    font-size: 1.25rem;
    margin: 0 0 0.6rem;
  }
  .boot-auto {
    margin-top: 0.75rem;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.75);
  }
}
.boot-retry {
  margin-top: 1rem;
  padding: 0.55rem 1.4rem;
  border: none;
  border-radius: 8px;
  background: var(--accent-color);
  color: #140d02;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

/* Action buttons inside the description panel (Share). */
.desc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.desc-view2d {
  margin-top: 0.6rem;
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  border: 1px solid var(--accent-color2);
  background: rgba(153, 200, 255, 0.12);
  color: var(--accent-color2);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: box-shadow 150ms ease, background 150ms ease;
}
.desc-view2d:hover {
  background: rgba(153, 200, 255, 0.22);
  box-shadow: 0 0 8px var(--accent-color2);
}

/* 3D marker hover label: thumbnail + name, anchored just above-right of the dot. */
.marker-tip {
  position: absolute;
  transform: translate(14px, -50%);
  z-index: 50;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  max-width: 14rem;
  padding: 0.3rem 0.5rem 0.3rem 0.3rem;
  background: rgba(4, 6, 24, 0.92);
  backdrop-filter: blur(6px);
  border: 1px solid var(--accent-color);
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.6);
}
.marker-tip-name {
  color: #fff;
  font-size: 0.78rem;
  line-height: 1.2;
}
.marker-tip-hint {
  display: block;
  margin-top: 0.15rem;
  color: var(--accent-color2);
  font-size: 0.75rem;
}

.hamb-menu {
  display: none;
  position: absolute;
  top: 3rem;
  left: 0;
  margin: 0;
  padding: 0.4rem;
  list-style: none;
  width: 14rem;
  background: rgba(4, 6, 24, 0.92);
  backdrop-filter: blur(6px);
  border: 1px solid var(--accent-color);
  border-radius: 10px;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.6);
  max-height: calc(100vh - 4.5rem);
  max-height: calc(100dvh - 4.5rem);
  overflow-y: auto;

  &.show {
    display: block;
  }
}

.hamb-menu-item {
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  font: inherit;
  padding: 0.5rem 0.6rem;
  border-radius: 6px;
  color: #eee;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  /* Leading glyph (font-awesome icon or WWT logo): fixed-width gutter so the
     labels line up. Scoped to the leading element so it never squishes the
     label text (e.g. the italic "INTUITIVE"). */
  > i,
  > .hamb-menu-logo {
    flex: 0 0 1.2rem;
    color: var(--accent-color);
    text-align: center;
  }

  .hamb-menu-logo {
    vertical-align: middle;
  }

  /* Label wraps all inline text so flex `gap` doesn't split it word-by-word. */
  .hamb-menu-label {
    em {
      font-style: italic;
    }
    sup {
      font-size: 0.7em;
    }
  }

  &:hover {
    background: rgba(240, 171, 82, 0.12);
    color: #fff;
  }

  /* On/off state for toggles (aria-pressed carries it for screen readers). */
  .menu-check {
    margin-left: auto;
    color: var(--accent-color);
    opacity: 0;
  }
  .menu-check.on {
    opacity: 1;
  }
}

/* Layer panel */
.gallery-wrap {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 11;
}

/* Kiosk: the gallery becomes an edge-to-edge strip along the top (the
   LayerPanel component flips to a horizontal row via its kiosk prop). */
.kiosk .gallery-wrap {
  top: 0;
  left: 0;
  right: 0;
}

/* Intro modal */
.intro-backdrop {
  position: absolute;
  inset: 0;
  // Above .marker-tip (z50), so a 3D hover tooltip can't render over the
  // intro dialog. Below #modal-loading (z100, common.less) — the loading
  // overlay must still cover the intro while startup assets stream in.
  z-index: 60;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.intro-modal {
  position: relative;
  max-width: min(640px, 92vw);
  max-height: 88vh;
  overflow-y: auto;
  /* The dialog container takes programmatic focus on open (tabindex="-1") —
     never show a ring on the container itself. */
  outline: none;
  background: rgba(4, 6, 24, 0.96);
  border: 2px solid var(--accent-color);
  border-radius: 18px;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
  padding: 1.75rem 1.5rem 1.25rem;
  color: #eaeaea;
}

.intro-modal-close {
  position: absolute;
  top: 0.6rem;
  right: 0.9rem;
  background: none;
  border: none;
  color: var(--accent-color2);
  font-size: 1.4rem;
  cursor: pointer;
}

/* Splash logos: a bigger Rocket Center logo, then two attribution rows pairing
   each logo with its caption ("…CosmicDS toolkit" / "Powered by WWT") — matches
   the exo-sonification splash, and sidesteps having to size-match a bare sphere
   against the CosmicDS wordmark. */
.intro-modal-logos {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  margin-bottom: 0.9rem;
}

.intro-logo-ip {
  height: 80px;
  max-width: 85%;
  width: auto;
  object-fit: contain;
  margin-bottom: 0.25rem;
}

.intro-logo-row {
  display: flex;
  align-items: center;
  justify-content: center;
}

.intro-logo-attr {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #9bb8d8;
  font-size: 0.78rem;
  text-decoration: none;
  transition: color 0.2s;

  &:hover { color: #d0e8ff; }
}

.intro-logo-cds {
  height: 22px;
  width: auto;
  object-fit: contain;
}

.intro-logo-wwt {
  height: 22px;
  width: auto;
  object-fit: contain;
  filter: brightness(1.2);
}

.intro-title {
  text-align: center;
  font-size: 1.5rem;
  color: var(--accent-color);
  margin-bottom: 1rem;
  line-height: 1.2;
}

.intro-section-title {
  font-size: 1.1rem;
  color: var(--accent-color2);
  margin: 1rem 0 0.5rem;
}

.intro-body p {
  margin-bottom: 0.75rem;
  line-height: 1.5;
}

.intro-instructions {
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    display: flex;
    gap: 0.6rem;
    margin-bottom: 0.6rem;
    line-height: 1.4;
  }

  .intro-icon {
    flex: 0 0 1.4rem;
    color: var(--accent-color);
    text-align: center;
    padding-top: 0.15rem;
  }
}

.intro-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1.1rem;
}
.intro-action {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--accent-color);
  background: none;
  color: var(--accent-color);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;

  &.primary {
    background: var(--accent-color);
    color: #140d02;
  }
  &:hover {
    box-shadow: 0 0 8px var(--accent-color);
  }
}

.intro-credits {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 0.82rem;
  color: #bbb;
  text-align: center;
}

/* Survey menu — themed to match the gallery / hamburger menu panels */
.survey-menu {
  width: min(16rem, 100%);
  max-height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: rgba(4, 6, 24, 0.92);
  backdrop-filter: blur(6px);
  border: 1px solid var(--accent-color);
  border-radius: 10px;
  padding: 0.4rem;
  pointer-events: auto;
}

.survey-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0.4rem 0.4rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 0.3rem;
}

.survey-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--accent-color);
  font-size: 0.9rem;
  font-weight: bold;

  i {
    color: var(--accent-color);
  }
}

.survey-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 40vh;
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
}

.survey-list::-webkit-scrollbar {
  width: 6px;
}
.survey-list::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.25);
  border-radius: 3px;
}

.survey-option {
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  font: inherit;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.5rem;
  border-radius: 6px;
  color: #eee;
  font-size: 0.85rem;
  cursor: pointer;

  .survey-check {
    width: 1rem;
    text-align: center;
    color: var(--accent-color);
    visibility: hidden;
  }

  &:hover {
    background: rgba(240, 171, 82, 0.12);
    color: #fff;
  }

  &.active {
    color: var(--accent-color);

    .survey-check {
      visibility: visible;
    }
  }
}

.survey-close {
  background: none;
  border: none;
  color: var(--accent-color2);
  cursor: pointer;
}

/* Description panel */
/* Bottom dock (see layoutDock): one flex column for the survey menu or the
   marker card or description panel. Children shrink rather
   than overlap; the empty part of the dock lets clicks through to the sky. */
.bottom-dock {
  position: absolute;
  left: var(--dock-left, 1rem);
  right: var(--dock-right, 1rem);
  bottom: 0.75rem;
  z-index: 10;
  max-height: var(--dock-max-h, calc(100vh - 5rem));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  pointer-events: none;
}

.description-panel {
  position: relative;
  width: min(60ch, 100%);
  /* The description gets at most ~40% of the screen so the image stays in
     view; inside the dock it shrinks further when space is short. */
  max-height: 40vh;
  max-height: 40dvh;
  min-height: 0;
  flex: 0 1 auto;
  display: flex;
  flex-direction: column;
  background: rgba(4, 6, 24, 0.88);
  backdrop-filter: blur(6px);
  border: 1px solid var(--accent-color);
  border-radius: 12px;
  padding: 0.75rem 1rem 0.9rem;
  color: #eaeaea;
  pointer-events: auto;
}

/* Only the description text scrolls; title, tour caption and actions stay put. */
.desc-body {
  flex: 1 1 auto;
  min-height: 2.5rem;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.desc-close {
  position: absolute;
  top: 0.4rem;
  right: 0.6rem;
  background: none;
  border: none;
  color: var(--accent-color2);
  cursor: pointer;
}

/* Title row: small thumbnail + title side by side (the thumb only shows in 3D,
   where the main view isn't the image itself). */
.desc-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.4rem;
}

.desc-title {
  color: var(--accent-color);
  font-size: 1.05rem;
  margin: 0 1.5rem 0 0;
}

/* P3.4: prev/next chevrons flanking the title. Borderless icon buttons in the
   secondary theme color, gold on hover, visible ring on :focus-visible only. */
.desc-step {
  flex: 0 0 auto;
  background: none;
  border: none;
  color: var(--accent-color2);
  cursor: pointer;
  font-size: 0.85rem;
  line-height: 1;
  padding: 0.2rem 0.35rem;
  transition: color 120ms ease;

  &:hover {
    color: var(--accent-color);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-color2);
    outline-offset: 1px;
    border-radius: 4px;
  }
}

/* Push the next chevron to the right end of the header row and keep it clear of
   the absolute-positioned .desc-close X (which sits at right: 0.6rem). */
.desc-step-next {
  margin-left: auto;
  margin-right: 1.4rem;
}

.desc-distance {
  font-size: 0.78rem;
  color: var(--accent-color2);
  margin: -0.15rem 0 0.45rem;
}

.desc-text {
  font-size: 0.85rem;
  line-height: 1.45;
  margin-bottom: 0.5rem;
}

.desc-credits {
  font-size: 0.78rem;
  color: #bbb;
}

/* Kiosk: a tighter info box — the exhibit screen is portrait, so the full
   60ch/32vh panel crowded the view (and used to overlap the right-hand
   gallery before it moved to the top strip). Text sizes stay as-is for
   readability; the panel still scrolls internally when a description is long. */
.kiosk .description-panel {
  width: min(48ch, 100%);
  max-height: 24vh;
}

.desc-learn {
  margin-left: 0.5rem;
  white-space: nowrap;
}

/* Guided tour strip (audit J8), at the top of the description panel. */
.tour-strip {
  margin: -0.15rem 1.5rem 0.6rem 0;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.tour-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}
.tour-label {
  color: var(--accent-color2);
  font-size: 0.8rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.tour-exit {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font: inherit;
  font-size: 0.78rem;
  text-decoration: underline;
  cursor: pointer;
}
.tour-caption {
  margin: 0.4rem 0 0.5rem;
  font-size: 0.95rem;
  line-height: 1.4;
  color: #fff;
}
.tour-nav {
  display: flex;
  gap: 0.5rem;
}
.tour-btn {
  padding: 0.35rem 0.8rem;
  border-radius: 6px;
  border: 1px solid var(--accent-color);
  background: none;
  color: var(--accent-color);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;

  &.primary {
    background: var(--accent-color);
    color: #140d02;
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
}

/* Kiosk staff warning (audit J2): small, bottom-right, unmissable for staff. */
.kiosk-staff-warning {
  position: absolute;
  right: 0.8rem;
  bottom: 0.6rem;
  z-index: 30;
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  background: #5a1d00;
  border: 1px solid #ff9e4a;
  color: #ffd9b8;
  font-size: 0.8rem;
  pointer-events: none;
}

/* Bottom-left logos */
.bottom-logos {
  position: absolute;
  bottom: 0.6rem;
  left: 0.8rem;
  z-index: 8;
  display: flex;
  align-items: center;
  gap: 0.4rem;

  img {
    height: 30px;
    width: auto;
    vertical-align: middle;
  }
}

/* Kiosk top-center bar: fixed just below the thumbnail strip, holding the
   "take it home" pill and (in 3D) the View-in-2D control. */
.kiosk-top-bar {
  position: absolute;
  top: calc(var(--kiosk-strip-h, 0rem) + 0.6rem);
  left: 50%;
  transform: translateX(-50%);
  z-index: 12;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

/* Kiosk "take it home" pill — lives in the top-center bar. Matches the
   .control-btn look (dark fill, gold border/text). Kiosk-only. */
.kiosk-home-btn {
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  background: rgba(4, 6, 24, 0.88);
  backdrop-filter: blur(6px);
  border: 1px solid var(--accent-color);
  color: var(--accent-color);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  transition: box-shadow 150ms ease, color 150ms ease;
}
.kiosk-home-btn:hover {
  color: var(--accent-color2);
  box-shadow: 0 0 8px var(--accent-color);
}

/* "View in 2D" inside the kiosk top bar: same look as the description-panel
   version, but sized to sit flush beside the take-home pill. */
.kiosk-view2d {
  margin-top: 0;
  padding: 0.45rem 0.85rem;
  font-size: 0.85rem;
}

/* Attract-mode "Touch to explore" hint — pulsing, screen-center (the most
   obvious spot on the exhibit; it never coexists with a guest interaction,
   so it can't obstruct anything being used), non-interactive. */
.kiosk-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 20;
  padding: 0.55rem 1.2rem;
  border-radius: 999px;
  background: rgba(4, 6, 24, 0.88);
  backdrop-filter: blur(6px);
  border: 1px solid var(--accent-color);
  color: var(--accent-color);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: 0 0 8px var(--accent-color);
}
@media (prefers-reduced-motion: no-preference) {
  .kiosk-hint {
    animation: kiosk-pulse 2.4s ease-in-out infinite;
  }
}
@keyframes kiosk-pulse {
  0%, 100% { opacity: 0.65; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
}

/* Transitions */
@media (prefers-reduced-motion: no-preference) {
  .intro-fade-enter-active,
  .intro-fade-leave-active {
    transition: opacity 0.25s ease;
  }
}
.intro-fade-enter-from,
.intro-fade-leave-to {
  opacity: 0;
}

@media (max-width: 600px) {
  .gallery-wrap {
    top: 0.5rem;
    right: 0.5rem;
  }
  /* Leave the right-hand layer panel (11rem) its column; the marker toggles
     wrap onto their own rows rather than slide under it. */
  .top-left-controls {
    top: 0.5rem;
    left: 0.5rem;
    max-width: calc(100vw - 13rem);
  }
  .catalog-toggles {
    flex-wrap: wrap;
  }
  .catalog-toggle {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
  }

  /* Keep the gallery on top (z 11) but shrink the info box so it stays clear of
     it. The layer panel is also height-capped on mobile (see LayerPanel.vue) so
     it no longer runs down over the bottom panels. */
  .description-panel {
    max-height: none;
    padding: 0.6rem 0.8rem 0.7rem;
  }
  .desc-title {
    font-size: 0.98rem;
  }
  .desc-text {
    font-size: 0.8rem;
  }
}

/* Landscape phones and other short screens (audit J7). These are wider than
   the 600px breakpoint, so they used to get the desktop layout, where the
   gallery, the description panel and the slider overlapped. Here the gallery
   becomes a narrow right-hand rail (LayerPanel.vue) and the panel and
   sliders sit to its left. */
@media (max-height: 500px) and (orientation: landscape) {
  .top-left-controls {
    top: 0.5rem;
    left: 0.5rem;
  }
  .gallery-wrap {
    top: 0.5rem;
    right: 0.5rem;
  }
  /* Short screens: keep most of the height for the image itself. */
  .description-panel {
    max-height: 52dvh;
    padding: 0.5rem 0.8rem 0.6rem;
  }
  .tour-caption {
    font-size: 0.85rem;
  }
}

/* The corner logos sit under the dock's bars until the screen is wide enough
   for the dock to stay clear of them (the intro still credits CosmicDS/WWT). */
@media (max-width: 1000px) {
  .bottom-logos {
    display: none;
  }
}
</style>
