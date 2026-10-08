<template>

  <v-app
    id="app"
    :style="cssVars"
  >
    
    <div
      id="main-content"
    >

      <WorldWideTelescope
        :wwt-namespace="wwtNamespace"
        @pointerdown="wwtOnPointerDown"
        @pointermove="wwtOnPointerMove"
        @pointerup="wwtOnPointerUp"
      ></WorldWideTelescope>



      <!-- This brings up the hamburger menu icon and the menu itself -->
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">

      <div class="hamb-icon-container">
        <button class="menu-toggle" @click="toggleMenu">
          <i class="fas fa-sliders-h" style="font-size: 24px;"></i>
        </button>

        <div :class="{ fullscreen: fullscreen }">
          <button class="fullscreen-button" @click="toggleFullscreen">
            <i :class="fullscreen ? 'fas fa-compress fa-lg' : 'fas fa-expand fa-lg'"></i>
          </button>
        </div>

        <!-- <div class="wwt-logo">
          <a	
            href="https://worldwidetelescope.org/home/"
            target="_blank"
            class="links">
            <img alt="WWT Logo" src="./assets/logo_wwt.png" width="20" height="20" style="vertical-align: middle;"/>
            <div class="wwt-logo-text"> Powered by WorldWide Telescope</div>
          </a>
        </div> -->

        <ul class="hamb-menu-container" :class="{'show': isMenuOpen }">

          <li class="hamb-menu-items" style="cursor: pointer;" @click="openIntro">
            <i class="fas fa-regular fa-info-circle"></i>
            Overview
          </li>

          <li class="hamb-menu-items" style="cursor: pointer;" @click="toggleBgButton">
            <i class="fas fa-solid fa-star"></i> 
            Choose sky survey
          </li>

          <li class="hamb-menu-items" @click="toggleLink">
            <a 
              href="https://arxiv.org/abs/2310.01231" 
              target="_blank"
              style="text-decoration: none; color: inherit;" 
              onmouseover="this.style.textDecoration='none';" 
              onmouseout="this.style.textDecoration='none';">
              <i class="fas fa-regular fa-newspaper"></i> JuMBOs publication
            </a>
          </li>

          <li class="hamb-menu-items" @click="toggleLink">
            <a 
              href="https://arxiv.org/abs/astro-ph/0506650" 
              target="_blank"
              style="text-decoration: none; color: inherit;" 
              onmouseover="this.style.textDecoration='none';" 
              onmouseout="this.style.textDecoration='none';">
              <i class="fas fa-regular fa-newspaper"></i> Proplyds publication
            </a>
          </li>          
          
          <!-- <li class="hamb-menu-items" style="cursor: pointer;" @click="toggleBgSlider"><i class="fas fa-adjust"></i> Crossfade </li> -->

          <li class="hamb-menu-items">
            <a 
              href="https://www.rocketcenter.com/INTUITIVEPlanetarium/InteractiveAstronomy" 
              target="_blank"
              style="text-decoration: none; color: inherit;" 
              onmouseover="this.style.textDecoration='none';" 
              onmouseout="this.style.textDecoration='none';">
              <i class="fas fa-solid fa-rocket"></i> 
              <i> INTUITIVE</i><sup>®</sup> 
              Planetarium
            </a>
          </li>
        </ul>
      </div>      

      <!-- <div v-show="showTitle" @click="hideTitle" >
        <p class="title"> {{ title }} </p>
      </div> -->

      <div class="bg-menu-container" v-show="showBgButton">
        <span style="text-shadow: 0px 0px 5px black;" class="bg-menu-text">Sky survey: </span>
        <select style="text-shadow: 0px 0px 2px black;" v-model="curForegroundImagesetName" class="bg-menu" @change="hideMenu">
          <option
            v-for="bg in backgroundImagesets"
            v-bind:value="bg.imagesetName"
            v-bind:key="bg.imagesetName"
            class="custom-option" 
          >
            {{ bg.displayName }}
          </option>
        </select>
      </div>

      <!-- This is the intro text -->
      <div class="intro-container" v-if="showIntro" >
        <div class="close-intro" @click="closeIntro">
          <i class="fas fa-times" style="font-size: 20px"></i>
        </div>
        <h1 style="font-size: 18px; font-family: 'Roboto'; margin-bottom: 1em;">{{ introTitle }}</h1>
        <p class="text" style="font-size: 14px; margin-bottom: 1em;">{{ introText }}</p>
        <p style="font-size: 14px; margin-bottom: 1em;">{{ introInstructions }}</p>
        <p style="font-size: 14px; margin-bottom: 1em;">
          Interactive created by 
          <a
            href="https://twitter.com/ADavidWeigel"
            target="_blank"
            class="links" 
            style="margin-right: 0.5em;">A. David Weigel</a>
          <a
            href="https://www.linkedin.com/in/erika-s-a37431153/"
            target="_blank"
            class="links"
            style="margin-right: 0.5em;">Érika Silva</a>
          <a
            href="https://newton.cx/~peter/"
            target="_blank"
            class="links"
            style="margin-right: 0.5em;">Peter K. G. Williams</a> 
          <a
            href="https://www.jcarifio.com/projects"
            target="_blank"
            class="links"
            style="margin-right: 0.5em;">Jon Carifio</a>
        </p>

        <p style="font-size: 14px;">
          <a	
            href="https://worldwidetelescope.org/home/"
            target="_blank"
            class="links">
            Powered by WorldWide Telescope<a><img alt="WWT Logo" src="./assets/logo_wwt.png" width="20" height="20" style="vertical-align: middle; margin-left: 0.5em;"/></a>
          </a>
        </p>
      </div> 

      <div v-if="showDescription" class="description-container" v-show="!showBgButton">
        <div class="close-description" @click="closeDescription">
          <i class="fas fa-times" style="font-size: 20px;"></i>
        </div>
        <h1 style="font-size: 18px; margin-bottom: 1em;">{{ descrTitles }}</h1>
        <p style="font-size: 16px; margin-bottom: 1em;">{{ descriptions }}</p>
        <p style="font-size: 16px;"> 
        <i> Credits: {{ descrCredits }} </i>
        <a style="font-size: 16px; margin-left: 0.5em;"> - </a>
        <a 
          :href= "descrCreditsURL"
          target="_blank" 
          class="links"> 
          <a style="vertical-align: middle; margin-left: 0.5em;"><i class="fas fa-solid fa-rocket" style="margin-right: 0.5em;"></i></a>Learn more </a>
        </p>
    </div>

      <transition name="fade">
        <div
          class="modal"
          id="modal-loading"
          v-show="isLoading"
        >
          <div class="container">
            <div class="spinner"></div>
            <p>Loading …</p>
          </div>
        </div>
      </transition>

      <!-- close-popover are the labels of the proplyds -->
      <div
        id="circle-popover"
        v-show="lastClosePt !== null"
        :style="popoverCssVars"
      >
        {{ lastClosePt?.name }}
      </div>

      <div v-show="showJumbosButton" class="jumbos-container">
        <v-checkbox
        :color="color1"
        v-model="jumbos"
        style="font-size: 10px;"
        @keyup.enter="jumbos = !jumbos"
        class="jumbos-checkbox"
        label="JuMBOs"
        hide-details
        />
      </div>

      <div v-show="showProplydsButton" class="proplyds-container">
        <v-checkbox
        :color="color3"
        v-model="proplyds"
        style="font-size: 10px;"
        @keyup.enter="proplyds = !proplyds"
        class="proplyds-checkbox"
        label="PROPLYDS"
        hide-details
        />
      </div>


        
      <div v-show="showFolderView" @click="toggleFolderView"> 
        <folder-view
          v-if="imagesetFolder !== null"
          sliders
          expandable
          :thumbnails="true"
          :open="mobile ? true : true"
          :root-folder="imagesetFolder"
          :incomingItemSelect="incomingItemSelect"
          flex-direction="column"
          @select="onItemSelected"
          @opacity="onOpacityChanged"
        ></folder-view> 
      </div>
          
      <!-- This gives the background crossfade buttons and slider functionality -->
      <!--<div class="bg-slider-container" v-if="showBgSlider">
        <template v-if="currentTool == 'crossfade'">
          <span
            class="bg-slider-text"
            @click="foregroundOpacity = 0"
            @keyup.enter="foregroundOpacity = 0"
            tabindex="0"
          >{{ curBackgroundImagesetName }}<br></span>
          <input
            class="opacity-range"
            type="range"
            v-model="foregroundOpacity"
          />
          <span
            class="bg-slider-text"
            @click="foregroundOpacity = 100"
            @keyup.enter="foregroundOpacity = 100"
            tabindex="0"
            >{{ curForegroundImagesetName }}<br>
          </span>
        </template>
      </div>-->
    </div>
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { csvFormatRows, csvParse } from "d3-dsv";

import { distance } from "@wwtelescope/astro";
import { Color, Constellations, Folder, Layer, LayerManager, Poly, RenderContext, Settings, SpreadSheetLayer, WWTControl } from "@wwtelescope/engine";
import { ImageSetType, MarkerScales, PlotTypes, PointScaleTypes, Thumbnail } from "@wwtelescope/engine-types";

import L, { LeafletMouseEvent, Map } from "leaflet";
import { tween } from "femtotween";
import { MiniDSBase, BackgroundImageset, skyBackgroundImagesets} from "@minids/common";

import { ImageSetLayer, Place, Imageset } from "@wwtelescope/engine";

import { ref, onMounted } from 'vue';

import { applyImageSetLayerSetting, applySpreadSheetLayerSetting } from "@wwtelescope/engine-helpers";

import { proplydsCsv } from "./data/proplyds_data(150)";

import { jumbosCsv } from "./data/jumbo_data(42)";

import { drawSkyOverlays, initializeConstellationNames, makeAltAzGridText, drawSpreadSheetLayer, layerManagerDraw } from "./wwt-hacks";


function parseCsvTable(csv: string) {
  return csvParse(csv, (d) => {
    return {
      name: d.Name!,  // + makes it a number - we don't want that here
      ra: +d.RA!,
      dec: +d.DEC!,
    };
  });
}

const proplydsContainers = document.getElementsByClassName("proplyds-container");

for (let i = 0; i < proplydsContainers.length; i++) {
  proplydsContainers[i].addEventListener("click", function() {
    const proplydsIcon = proplydsContainers[i].querySelector(".proplyds-icon")
    if (proplydsIcon !== null) {
      proplydsIcon.classList.toggle("fa-toggle-on");
      proplydsIcon.classList.toggle("fa-toggle-off");

      if (proplydsIcon.classList.contains("fa-toggle-on")) {
        proplydsIcon.classList.add("active");
      } else {
        proplydsIcon.classList.remove("active");
      }
    }

  });
}

const proplydsTable  = parseCsvTable(proplydsCsv);
type Table = typeof proplydsTable;
type TableRow = typeof proplydsTable[number];

const jumbosTable  = parseCsvTable(jumbosCsv);
type TableJ = typeof jumbosTable;
type TableRowJ = typeof jumbosTable[number];

function formatCsvTable(table: Table): string {
  return csvFormatRows([[
    "Name", "RA", "Dec"
  ]].concat(table.map((d, _i) => {
    return [
      d.name.toString(),
      d.ra.toString(),
      d.dec.toString(),
    ];
  }))).replace(/\n/g, '\r\n');
  // By using a regex, we replace all instances.
  // For WWT implementation reasons (left over from 
  // the Windows client?), we need the line endings 
  // to be CRLF
}

const proplydsString = formatCsvTable(proplydsTable);
const jumbosString = formatCsvTable(jumbosTable);

interface MoveOptions {
  instant?: boolean;
  zoomDeg?: number;
  rollRad?: number;
}

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const hms2R = (360 * Math.PI) / 4320; // First convert to degrees and then to radians: ((1 / 24) * 360) * (Math.PI / 180);

type LocationRad = {
  longitudeRad: number;
  latitudeRad: number;
};

type EquatorialRad = {
  raRad: number;
  decRad: number;
};

type HorizontalRad = {
  altRad: number;
  azRad: number;
};

interface PointData {
  x: number;
  y: number;
  ra: number;
  dec: number;
  name: string;
  color: Color;
}

type ToolType = "crossfade" | "choose-background" | null;
type SheetType = "text" | "video" | null;

export default defineComponent({

  setup() {
    const fullscreen = ref(false);

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }

    onMounted(() => {
      document.addEventListener('fullscreenchange', () => {
        fullscreen.value = !!document.fullscreenElement;
      });
    });

    return {
      fullscreen,
      toggleFullscreen
    };
  },

  extends: MiniDSBase,
  name: 'MyComponent',
  
  props: {
    wtml: {
      type: Object,
      required: true
    },
    wwtNamespace: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    thumbnailUrl: {
      type: String,
      required: true
    },
    bgWtml: {
      type: String,
      required: true
    },
    bgName: {
      type: String,
      required: true
    },
    fgName: {
      type: String,
      required: true
    },
    title: {
      required: true
    },
    introText: {
      required: true
    },
    introTitle: {
      required: true
    },
    introInstructions: {
      required: true
    },
  },
  
  data() {
    return {
      isMenuOpen: false,
      hiddenTitle: false,
      hiddenIntro: false,
      showIntro: true,
      showBgButton: false,
      showBgSlider: true,
      showFolderView: true,
      showProplydsButton: true,
      showJumbosButton: true,
      descriptions: '',
      descrTitles: '',
      descrCredits: '',
      descrCreditsURL: '',
      showDescription: false,
      showLeftMenu: false,
      showTitle: true,
      
 
      showSplashScreen: true,
      imagesetLayers: {} as Record<string, ImageSetLayer>,
      layersLoaded: false,
      positionSet: false,
      imagesetFolder: null as Folder | null,
      backgroundImagesets: [] as BackgroundImageset[],
      layers: {} as Record<string,ImageSetLayer>,

      color0: "#ffffff",
      color1: "#298E00",
      color2: "#ffaa00",
      color3: "#FF00F7",
      colorp: "#8901bd",
      color4: "#00c9ff",
      color5: "#ff0000",
      colorD: "#45aecb",
      // colorRed: "#000000",
      todayColor: "#D6B004",

      currentAllLayer: null as SpreadSheetLayer | null,

      proplyds: true,
      proplydsLayer: null as SpreadSheetLayer | null,

      jumbos: true,
      jumbosLayer: null as SpreadSheetLayer | null,

      incomingItemSelect: null as Thumbnail | null,
      sheet: null as SheetType,
      showTextTooltip: false,
      showVideoTooltip: false,
      showControls: false,
      currentTool: "crossfade" as ToolType,
      tab: 0,
      map: null as Map | null,
      selectionProximity: 4,
      pointerMoveThreshold: 6,
      isPointerMoving: false,
      pointerStartPosition: null as { x: number; y: number } | null,
      lastClosePt: null as PointData | null
    };
  },


  mounted() {

    this.waitForReady().then(async () => {
      // SpreadSheetLayer.prototype.draw = drawSpreadSheetLayer;


      this.setClockSync(false);
      this.imagesetFolder = await this.loadImageCollection({
        url: this.wtml.layeredimagery,
        loadChildFolders: false
      });
      const children = this.imagesetFolder.get_children() ?? [];
      const layerPromises: Promise<Layer>[] = [];

      children.reverse().forEach((item) => {
        if (!(item instanceof Place)) { return; }
        const imageset = item.get_backgroundImageset() ?? item.get_studyImageset();
        if (imageset == null) { return; }
        const name = imageset.get_name();
        layerPromises.push(this.addImageSetLayer({
          url: imageset.get_url(),
          mode: "autodetect",
          name: name,
          goto: false
        }).then((layer) => {
          this.imagesetLayers[name] = layer;
          applyImageSetLayerSetting(layer, ["opacity", 1]); // Here is where you set your initial image's opacity to either 0 or 1 (0 being invisible).
          return layer;
        }));
      });
      
      this.loadImageCollection({
        url: this.bgWtml,
        loadChildFolders: true,
      }).then((_folder) => {
        this.curForegroundImagesetName = this.fgName;
        this.curBackgroundImagesetName = this.bgName;
        this.foregroundOpacity = 75; //set to zero if going to use tween for dramatic fade

        //tween(0, 50, (value) => { this.foregroundOpacity = value; }, {
        //  time: 7500,
          //ease: (t: number) => t * (2 * (1 - t) * 1.75 + t * 0.5),
          //done: () => { this.foregroundOpacity = 50; }
        //});
      });
      
      
      // this.backgroundImagesets = [...skyBackgroundImagesets]; // This is the default background imagery

      this.createTableLayer({
        name: "Proplyds",
        referenceFrame: "Sky",
        dataCsv: proplydsString
      }).then((layer) => {
        layer.set_lngColumn(1);
        layer.set_latColumn(2);
        layer.set_markerScale(MarkerScales.world);
        this.applyTableLayerSettings({
          id: layer.id.toString(),
          settings: [
            ["scaleFactor", 0.15],
            ["plotType", PlotTypes.circle],
            ["color", Color.fromHex(this.color3)],
            //["sizeColumn", 4],
            //["pointScaleType", PointScaleTypes.log],
            ["opacity", 100]
          ]
        });
        this.proplydsLayer = layer;
      });

      this.createTableLayer({
        name: "JuMBOS",
        referenceFrame: "Sky",
        dataCsv: jumbosString
      }).then((layer) => {
        layer.set_lngColumn(1);
        layer.set_latColumn(2);
        layer.set_markerScale(MarkerScales.world);
        this.applyTableLayerSettings({
          id: layer.id.toString(),
          settings: [
            ["scaleFactor", 0.15],
            ["plotType", PlotTypes.circle],
            ["color", Color.fromHex(this.color1)],
            // ["sizeColumn", 4],
            //["pointScaleType", PointScaleTypes.log],
            ["opacity", 100]
          ]
        });
        this.jumbosLayer = layer;
      });

      this.showControls = !this.mobile;

      /* This section adds extra foreground imagery to the default sky survey menu. 
      This is hard coded and we could find a better way to add them in the future. */
      this.loadImageCollection({
        url: this.bgWtml,
        loadChildFolders: true,
      }).then((folder) => {
        this.backgroundImagesets.unshift(
          new BackgroundImageset("SFD Dust Map (Infrared)", "SFD Dust Map (Infrared)") 
        );
      });

      this.loadImageCollection({
        url: this.bgWtml,
        loadChildFolders: true,
      }).then((folder) => {
        this.backgroundImagesets.unshift(
          new BackgroundImageset("2Mass (Infrared)", "2Mass: Imagery (Infrared)") 
        );
      });      

      this.loadImageCollection({
        url: this.bgWtml,
        loadChildFolders: true,
      }).then((folder) => {
        this.backgroundImagesets.unshift(
          new BackgroundImageset("WISE (Infrared)", "WISE All Sky (Infrared)") 
        );
      });

      this.loadImageCollection({
        url: this.bgWtml,
        loadChildFolders: true,
      }).then((folder) => {
        this.backgroundImagesets.unshift(
          new BackgroundImageset("unWISE (Infrared)", "unWISE color, from W2 and W1 bands") 
        );
      });

      this.loadImageCollection({
        url: this.bgWtml,
        loadChildFolders: true,
      }).then((_folder) => {
        this.backgroundImagesets.unshift(
          new BackgroundImageset("PanSTARRS1 3pi (Optical) ", "PanSTARRS1 3pi") 
        );
      });
      
      // this.loadImageCollection({
      //   url: this.bgWtml,
      //   loadChildFolders: true,
      // }).then((folder) => {
      //   this.backgroundImagesets.unshift(
      //     new BackgroundImageset("Digitized Sky Survey (Optical)", "Digitized Sky Survey (Color)") 
      //   );
      // });

      this.loadImageCollection({
        url: this.bgWtml,
        loadChildFolders: true,
      }).then((_folder) => {
        this.backgroundImagesets.unshift(
          new BackgroundImageset("USNOB (Optical)", "USNOB: US Naval Observatory B 1.0 (Synthetic, Optical)") // First name is what you want the menu to look like, second name should be what you see in your WWT collection.
        );
      });

      this.loadImageCollection({
        url: this.bgWtml,
        loadChildFolders: true,
      }).then((_folder) => {
        this.backgroundImagesets.unshift(
          new BackgroundImageset("Gaia DR2 (Optical)", "Gaia DR2") 
        );
      });

      this.loadImageCollection({
        url: this.bgWtml,
        loadChildFolders: true,
      }).then((_folder) => {
        this.backgroundImagesets.unshift(
          new BackgroundImageset("NASA Deep Star Maps (Optical)", "Deep Star Maps 2020") 
        );
      });

      this.loadImageCollection({
        url: this.bgWtml,
        loadChildFolders: true,
      }).then((_folder) => {
        this.backgroundImagesets.unshift(
          new BackgroundImageset("GALEX (Ultraviolet)", "GALEX (Ultraviolet)") 
        );
      });

      this.loadImageCollection({
        url: this.bgWtml,
        loadChildFolders: true,
      }).then((_folder) => {
        this.backgroundImagesets.unshift(
          new BackgroundImageset("ROSAT (X-ray)", "RASS: ROSAT All Sky Survey (X-ray)") 
        );
      });      

      this.loadImageCollection({
        url: this.bgWtml,
        loadChildFolders: true,
      }).then((_folder) => {
        this.backgroundImagesets.unshift(
          new BackgroundImageset("Fermi (Gamma)", "Fermi LAT 8-year (gamma)") 
        );
      });

      this.setLayerOpacityForImageSet("Short-wavelength NIRCam Orion Nebula", 1, true)

      Promise.all(layerPromises).then(() => {
        this.layersLoaded = true;
        
        // Set all of the imageset layers to be above the spreadsheet layers
        //this.resetImagesetLayerOrder();

        const splashScreenListener = (_event: KeyboardEvent) => {
          this.showSplashScreen = false;
          window.removeEventListener('keyup', splashScreenListener);
        };
        window.addEventListener('keyup', splashScreenListener);

        window.addEventListener('keyup', (event: KeyboardEvent) => {
          if (["Esc", "Escape"].includes(event.key) && this.showVideoSheet) {
            this.showVideoSheet = false;
          }
        });
      });

      // this.wwtControl._drawSkyOverlays = drawSkyOverlays;
      // LayerManager._draw = layerManagerDraw;

      // wwtZoomDeg is still 0 if we run this here
      // and it was the same in nextTick
      // so give just a bit of a delay
      setTimeout(() => {
        this.positionSet = true;
      }, 100);

    });

  },

  
  computed: {

    wwtControl(): WWTControl {
      return WWTControl.singleton;
    },
    wwtRenderContext(): RenderContext {
      return this.wwtControl.renderContext;
    },
    wwtSettings(): Settings {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return Settings.get_active();
    },
    
    isLoading(): boolean {
      return !this.ready;
    },
    ready(): boolean {
      return this.layersLoaded && this.positionSet;
    },
    smallSize(): boolean {
      return this.$vuetify.display.smAndDown;
    },
    mobile(): boolean {
      return this.smallSize && this.touchscreen;
    },
    cssVars() {
      return {
        '--color-default': this.colorD,
        // '--color-default2': this.colorRed,
				'--color0':this.color0,
				'--color1':this.color1,
				'--color2':this.color2,
				'--color3':this.color3,
				'--color4':this.color4,
				'--color5':this.color5,
        '--app-content-height': this.showTextSheet ? '66%' : '100%',
      };
    },
    popoverCssVars() {
      const x = this.lastClosePt?.x ?? 0;
      const y = this.lastClosePt?.y ?? 0;

      // Note that the canvas takes up the full width
      const leftPct = 100 * x / window.innerWidth;
      const topPct = 100 * (y - 50) / window.innerHeight;
      return {
        '--current-color': this.lastClosePt?.color.toString() ?? "white",
        '--current-left': `${leftPct}%`,
        '--current-top': `${topPct}%`
      };
    },

    
    showTextSheet: {
      get(): boolean {
        return this.sheet === 'text';
      },
      set(_value: boolean) {
        this.selectSheet('text');
        this.showTextTooltip = false;
      }
    },
    showVideoSheet: {
      get(): boolean {
        return this.sheet === "video";
      },
      set(value: boolean) {
        this.selectSheet('video');
        if (!value) {
          const video = document.querySelector("#info-video") as HTMLVideoElement;
          video.pause();
        }
        this.showVideoTooltip = false;
      }
    },
    
    curBackgroundImagesetName: {
      get(): string {
        if (this.wwtBackgroundImageset == null) return "";
        return this.wwtBackgroundImageset.get_name();
      },
      set(name: string) {
        this.setBackgroundImageByName(name);
      }
    },
    
    curForegroundImagesetName: {
      get(): string {
        if (this.wwtForegroundImageset == null) return "";
        return this.wwtForegroundImageset.get_name();
      },
      set(name: string) {
        this.setForegroundImageByName(name);
      }
    },


    foregroundOpacity: {
      get(): number {
        return this.wwtForegroundOpacity;
      },
      set(o: number) {
        this.setForegroundOpacity(o); 
      }
    },
  },

  methods: {

    setSpreadSheetLayerOrder(id: string, order: number) {
      const layer = LayerManager.get_layerList()[id];
      const layers = LayerManager.get_allMaps()[layer.get_referenceFrame()].layers;
      if (order >= 0) {
        const currentIndex = layers.indexOf(layer);
        if (currentIndex > -1) {
          layers.splice(currentIndex, 1);
        }
        LayerManager.get_allMaps()[layer.get_referenceFrame()].layers.splice(order, 0, layer);
      }
    },

    closestInView(
      point: { x: number, y: number },
      threshold?: number
    ): PointData | null {

      let minDist = Infinity;
      let closestPt: PointData | null = null;

      const rowSeparator = "\r\n";
      const colSeparator = "\t";

      const raDecDeg = this.findRADecForScreenPoint(point);
      const target = { ra: D2R * raDecDeg.ra, dec: D2R * raDecDeg.dec };

      const layers = [this.proplydsLayer, this.jumbosLayer];
      for (const layer of layers) {
        if (layer == null) {
          continue;
        }

        const inView = layer.getTableDataInView();
        const rows = inView.split(rowSeparator);
        const header = rows.shift();
        if (!header) {
          continue;
        }

        const lngCol = layer.get_lngColumn();
        const latCol = layer.get_latColumn();
        const nameCol = 0;  // All of the data sets have the name in the first column

        for (const row of rows) {
          const values = row.split(colSeparator);
          const ra = D2R * Number(values[lngCol]);
          const dec = D2R * Number(values[latCol]);
          const pt = { ra: ra, dec: dec };
          const dist = distance(target.ra, target.dec, pt.ra, pt.dec);
          if (dist < minDist) {
            closestPt = {
              ...point,
              ra: ra,
              dec: dec,
              name: values[nameCol],
              color: layer.get_color()
            };
            minDist = dist;
          }
        }
      }

      if (closestPt !== null) {
        const closestRADecDeg = { ra: closestPt.ra * R2D, dec: closestPt.dec * R2D };
        const closestScreenPoint = this.findScreenPointForRADec(closestRADecDeg);
        const pixelDist = Math.sqrt((point.x - closestScreenPoint.x) ** 2 + (point.y - closestScreenPoint.y) ** 2);
        if (!threshold || pixelDist < threshold) {
          return closestPt;
        }
      }
      return null;

    },

    wwtOnPointerMove(event: PointerEvent) {
      if (!this.isPointerMoving && this.pointerStartPosition !== null) {
        const dist = Math.sqrt((event.pageX - this.pointerStartPosition.x) ** 2 + (event.pageY - this.pointerStartPosition.y) ** 2);
        if (dist > this.pointerMoveThreshold) {
          this.isPointerMoving = true;
        }
      }
      this.updateLastClosePoint(event);
    },

    wwtOnPointerDown(event: PointerEvent) {
      this.isPointerMoving = false;
      this.pointerStartPosition = { x: event.pageX, y: event.pageY };
    },

    wwtOnPointerUp(event: PointerEvent) {
      if (!this.isPointerMoving) {
        this.updateLastClosePoint(event);
      }
      this.pointerStartPosition = null;
      this.isPointerMoving = false;
    },

    updateLastClosePoint(event: PointerEvent): void {
      const pt = { x: event.offsetX, y: event.offsetY };
      const closestPt = this.closestInView(pt, this.selectionProximity);
      if (closestPt == null && this.lastClosePt == null) {
        return;
      }
      const needsUpdate =
        closestPt == null ||
        this.lastClosePt == null ||
        this.lastClosePt.ra != closestPt.ra ||
        this.lastClosePt.dec != closestPt.dec;
      if (needsUpdate) {
        this.lastClosePt = closestPt;
      }
    },

    wwtSmallestFov(): number {
      // ignore the possibility of rotation
      const w = this.wwtRenderContext.width;
      const h = this.wwtRenderContext.height;
      const fovH = this.wwtRenderContext.get_fovAngle() * D2R;
      const fovW = fovH * w / h;
      return Math.min(fovW, fovH);
    },
    
    // circleForLocation(latDeg: number, lonDeg: number): L.Circle<any> {
    //   return L.circle([latDeg, lonDeg], {
    //     color: "#FF0000",
    //     fillColor: "#FF0033",
    //     fillOpacity: 0.5,
    //     radius: 200
    //   });
    // },



    /* Toggles the hamburger menu when the hamburger icon is clicked */
    toggleMenu() {
      this.isMenuOpen = !this.isMenuOpen;
      this.showTitle = false;
      this.showFolderView = !this.showFolderView;
      this.showProplydsButton = !this.showProplydsButton;
      this.showJumbosButton = !this.showJumbosButton;
    },
    
    /* This is for the close button of the intro box */
    closeIntro() {
      this.showIntro = false;
    },
    
    /* This is for the "Toggle description" in the hamburger menu. It opens the intro container */
    openIntro() {
      this.showIntro = !this.showIntro;
      this.showBgButton = false;
      this.showDescription = false;
    },

    closeDescription() {
      this.showDescription = false;
    },

    /* Toggles the background button when the Choose background button is clicked */
    toggleBgButton() {
      this.showBgButton = !this.showBgButton;
      this.hiddenIntro = !this.hiddenIntro;
      this.showIntro = false;
      this.showDescription = false;
      this.showBgSlider = false;
      this.showFolderView = true;
      this.isMenuOpen = false;
      this.showProplydsButton = true;
      this.showJumbosButton = true;
    },    

    toggleBgSlider() {
      this.showBgSlider = !this.showBgSlider;
      this.showIntro = false;
      this.showDescription = false;
      this.showBgButton = false;
      this.showFolderView = true;
      this.isMenuOpen = false;
      this.showProplydsButton = true;
      this.showJumbosButton = true;
    },

    hideMenu() {
    this.showBgButton = false;
    this.showBgSlider = true;
    },

    toggleFolderView() {
      this.showIntro = false;
      this.showDescription = true;
    },

    hideTitle() {
      this.showTitle = false;
    },

    closeSplashScreen() {
      this.showSplashScreen = false;
    },

    selectSheet(name: SheetType) {
      if (this.sheet == name) {
        this.sheet = null;
      } else {
        this.sheet = name;
      }
    },

    getImageSetLayerIndex(layer: ImageSetLayer): number {
      // find layer in this.wwtActiveLayers
      // this.wwtActiveLayers is a dictionary of {0:id1, 1:id2, 2:id3, ...}
      // get the key item with the value of layer.id
      for (const [key, value] of Object.entries(this.wwtActiveLayers)) {
        if (value === layer.id.toString()) {
          return Number(key);
        }
      }
      return -1;
    },




    setLayerOpacityForImageSet(name: string, opacity: number, setting_opacity_from_ui=false) {
      const layer = this.imagesetLayers[name];
      if (layer != null) {
        // update the image opacity in the WWT control
        applyImageSetLayerSetting(layer, ['opacity', opacity]);

        // update the value for the slider only if we are not setting the opacity from the UI
        if (!setting_opacity_from_ui) {
          const selector = `#items div.item[title='${name}'] input.opacity-range[type='range']`;
          const el = (document.querySelector(selector) as HTMLInputElement);
          if (el != null) {
            el.value = `${opacity * 100}`;
          }
        }

        const toggleSelector = `#items input[type='checkbox'][title='${name}']`;
        const el2 = (document.querySelector(toggleSelector) as HTMLInputElement);
        // truth table: opacity == 0 and el.checked == false => do nothing
        // truth table: opacity == 0 and el.checked == true => set el.checked = false
        // truth table: opacity > 0 and el.checked == false => set el.checked = true
        // truth table: opacity > 0 and el.checked == true => do nothing
        if (el2 != null) {
          if (opacity == 0 && el2.checked) {
            el2.checked = false;
          } else if (opacity > 0 && !el2.checked) {
            el2.checked = true;
          }
        }
        
      }
    },
		
		onItemSelected(place: Place) {
      //this.logTimes(`onItemSelected: ${place.get_name()}`)
      const iset = place.get_studyImageset() ?? place.get_backgroundImageset();
      if (iset == null) { return; }
      const layer = this.imagesetLayers[iset.get_name()];

      // Give time for the selectedTime changes to propagate
      setTimeout(() => {
        this.$nextTick(() => {
          //if (this.image_out_of_view(place) || this.need_to_zoom_in(place)) {
            this.descriptions = place.htmlDescription;
            this.descrTitles = iset.get_name(); 
            this.descrCredits = iset.get_creditsText();
            this.descrCreditsURL = iset.get_creditsUrl();
            
            this.gotoRADecZoom({
              raRad: hms2R * place.get_RA(), // In the WTML file ra is in hours. Convert to radians (which is what hms2R does)
              decRad: D2R * place.get_dec(), // In the WTML file dec is in degrees. Convert to radians (which is what DR2 does)                
              // raRad: D2R * iset.get_centerX(), // We don't wanna use these lines because the will make the images skip
              // decRad: D2R * iset.get_centerY(),              
              zoomDeg: place.get_zoomLevel() * 9, 
              instant: true
            });
            //this.onOpacityChanged(place, 100, true);
            this.setLayerOpacityForImageSet(iset.get_name(), 1, false);
        });
      }, 10);  
    },
		
		onOpacityChanged(place: Place, opacity: number, move: boolean) {
      const iset = place.get_studyImageset() ?? place.get_backgroundImageset();
      if (iset == null) { return; }
      this.updateImageOpacity(place, opacity);
      

      // this.$nextTick(() => {
      //     this.incomingItemSelect = place;
      //     this.gotoRADecZoom({
      //       raRad: D2R * iset.get_centerX(),
      //       decRad: D2R * iset.get_centerY(),
      //       zoomDeg: this.wwtZoomDeg, //zoom,
      //       instant: false
      //     });
      // });
		},
		
		updateImageOpacity(place: Place, opacity: number) {
      const iset = place.get_studyImageset() ?? place.get_backgroundImageset();
      if (iset == null) { return; }
      const layer = this.imagesetLayers[iset.get_name()];
      if (layer == null) { return; }
        // applyImageSetLayerSetting(layer, ["opacity", opacity / 100]);
      // tell setLayerOpacityForImageSet that we are updating from the ui
      this.setLayerOpacityForImageSet(iset.get_name(), opacity / 100, true);
    },
  },

  watch: {

    proplyds(on: boolean) {
      if (this.proplydsLayer) {
        applySpreadSheetLayerSetting(this.proplydsLayer, ["opacity", on ? 1.0 : 0.0]);
      }
    },

    jumbos(on: boolean) {
      if(this.jumbosLayer) {
        applySpreadSheetLayerSetting(this.jumbosLayer, ["opacity", on? 1.0 : 0.0]);
      }
    },
    
  }
	

	
});

</script>

<style lang="less" scoped>

// .wwt-logo {
//   position: absolute;
//   top: 140%;
//   right: 30%;
//   z-index: 11;
//   cursor: pointer;
// }

// .wwt-logo-text {
//   opacity: 0;
//   background-color: transparent;
//   position: absolute;
//   right: 100%;
//   top: 10%;
//   width: 14em;
// }

// // .wwt-logo-text:hover {
// //   opacity: 1;
// // }

// .wwt-logo:hover .wwt-logo-text {
//   opacity: 1;
// }

.jumbos-checkbox :deep(label) {
  /* color: var(--color1);    */
  font-size: 13px;
  position: relative;
  font-family: Roboto;
  z-index: 11;
  text-shadow: 0px 0px 2px black;
}

.proplyds-checkbox :deep(label) {
  /* color: var(--color3);    */
  color: rgb(255, 255, 255);
  font-size: 13px;
  position: relative;
  font-family: Roboto;
  z-index: 11;
  text-shadow: 0px 0px 2px black;
}

.jumbos-container {
  background-color: rgba(0, 60, 135, 0.50);
  border-radius: 5px;
  height: 2.3rem;
  left: 0.5rem;
  position: absolute;
  top: 0.5rem;
  width: 6.7rem;
  cursor: pointer;
}
.proplyds-container {
  background-color: rgba(0, 60, 135, 0.50);
  border-radius: 5px;
  height: 2.3rem;
  left: 0.5rem;
  position: absolute;
  top: 3rem;
  width: 6.7rem;
  cursor: pointer;
}

/* .proplyds-icon {
  color:rgba(214, 4, 147,0.7)
}

.proplyds-icon.active {
  color:rgba(4, 32, 214, 0.7)
} */

.fullscreen {
  width: 100vw;
  height: 100vh;
  position: absolute;
}

.fullscreen-button {
  position: absolute;
  top: 80%;
  right: 30%;
  z-index: 11;
}

.bg-menu-container {
  position: absolute;
  display: inline-block;
  bottom: 6%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1rem;
  background-color: transparent;
  z-index: 1;
}

.bg-menu-text {
  display: flex;
  flex-direction: column;
  position: absolute;
  bottom: 0.5rem;
  right: 9.6rem;
  width: calc(100% - 1rem);
  pointer-events: none;
  align-items: center;
  gap: 25px;
}

.bg-menu {
  position: relative;
  background-color: rgba(0, 60, 135, 0.50);
  padding: 5px;
  color: #ececec;
  text-align: center;
  border-radius: 10px;
}

.bg-menu:hover {
  box-shadow: 0 0 3px 2px #1671e07c;
}

.custom-option {
  /* this is the problem with the select menu. It won't allow us to 
  style it properly. This only changes the color of the font. */
  color: #000000;
}

/* Where the hamburger menu icon is located */
.hamb-icon-container {
  position: absolute;
  right: 0;
  padding: 10px;
  z-index: 11;
}

/* Hamburger menu */
.hamb-menu-container {
  display: none;
  padding: 20%;
  position: absolute;
  border-radius: 10px;
  top: 20%;
  right: 90%;
  background-color: rgba(0, 60, 135, 0.50);
  width: 13.5rem;
  list-style-type: none; /* This removes the bullet points */
  font-family: Roboto;
  z-index: 11;
  text-shadow: 0px 0px 2px black;
}

/* Not sure what this is for, but it is needed for the menu to work */
.hamb-menu-container.show {
  display: block;
}

.hamb-menu-items:hover {
  background-color: #1671e000; /*#1671e0c0*/
  cursor: pointer;
  padding-left: 15px; /* Remove if you don't want the moving as hovering effect */
}

.description-container,
.intro-container {
  width: 90%;
  max-width: 50em;
  height: 160px;
  background-color: rgba(0, 60, 135, 0.50); 
  padding-left: 1.5em; 
  padding-right: 1.5em; 
  padding-top: 3px;
  border-radius: 10px; 
  position: absolute;
  bottom: 1em;
  left: 50%;
  transform: translateX(-50%);
  display: inline-block;
  overflow: auto; /* Allow vertical scrolling */
  font-family: Roboto;
  border: 1px solid rgba(0, 0, 0, 0);
  transition: border-color 0.3s ease;
  text-shadow: 0px 0px 2px black;
}

/* That pretty blue boarder when the intro box is hovered*/
.description-container:hover,
.intro-container:hover {
  box-shadow: 0 0 3px 2px #1671e07c; 
}

.description-container::-webkit-scrollbar,
.intro-container::-webkit-scrollbar {
  width: 0.5px;
  background-color: transparent;
}

.description-container::-webkit-scrollbar-track,
.intro-container::-webkit-scrollbar-track {
  background-color: transparent;
}

.description-container::-webkit-scrollbar-thumb,
.intro-container::-webkit-scrollbar-thumb {
  background-color: #ffffff00;
  border-radius: 0.5px;
}

.close-description,
.close-intro {
  position: absolute;
  top: 5px;
  right: 8px;
  cursor: pointer;
  padding: 2px;
  background-color: #00000000;
  // vertical-align: middle;
}

/* .title {
  color: #e4e3e3;
  background: rgba(0, 60, 135, 0.50);
  padding: 5px 5px;
  font-size: 1em;
  transform: translateX(-15%);
  border-radius: 10px;
  top: 10px;
  left: 50%;
  position: absolute;
} */

.bg-slider-container {
  display: flex;
  flex-direction: row;
  gap: 5px;
  width: 90%;
  max-width: 60em;
  padding-left: 1.5em; 
  padding-right: 1.5em; 
  padding-top: 3px;
  border-radius: 10px; 
  position: absolute;
  bottom: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
}

.bg-slider-text {
  color: #e4e3e3;
  background: rgba(0, 60, 135, 0.50);
  padding: 5px 5px;
  pointer-events: auto;
  font-size: 0.8em;
  text-align: center;
  border-radius: 10px;

  &:hover {
    box-shadow: 0 0 4px 3px #1671e07c;
    transition: all 200ms ease-out;
    cursor: pointer;
  }
}

.links {
  color: #e4e3e3;
}

@font-face {
  font-family: 'Roboto';
  src: url('./assets/Roboto.ttf')
}


/* From now on it has all the good stuff to make the screen fit all screen sizes */
html {
  line-height: 0.5;
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: #000;
  overflow: hidden;

  ::-webkit-scrollbar {
    // display: none;
  }
  
  -ms-overflow-style: none;
  // scrollbar-width: none;
}

body {
  position: fixed;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  font-family: Verdana, Arial, Helvetica, sans-serif;
}

#main-content {
  position: fixed;
  width: 100%;
  height: var(--app-content-height);
  overflow: hidden;

  transition: height 0.1s ease-in-out;
}

#app {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;

  .wwtelescope-component {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
    border-style: none;
    border-width: 0;
    margin: 0;
    padding: 0;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}

.modal {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  z-index: 100;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

#modal-loading {
  background-color: #000;
  .container {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    .spinner {
      background-image: url("../../assets/lunar_loader.gif");
      background-repeat: no-repeat;
      background-size: contain;
      width: 3rem;
      height: 3rem;
    }
    p {
      margin: 0 0 0 1rem;
      padding: 0;
      font-size: 150%;
    }
  }
}

.pointer {
  cursor: pointer;
}

.control-icon {
  pointer-events: auto;

  &:hover {
    cursor: pointer;
  }

  &:focus {
    color: white;
  }
}

.control-icon-wrapper {
  color: var(--color-default);
  background: #040404;
  padding: 8px 16px;
  border: 1px solid var(--color-default);
  border-radius: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: auto;

  &:hover {
    cursor: pointer;
  }

  &:focus {
    color: white;
    border-color: white;
  }
}

#circle-popover {
  background-color: rgba(0, 60, 135, 0.50);
  color: white;
  border: solid 1px var(--current-color);
  border-radius: 10px;
  position: relative;
  left: var(--current-left);
  top: var(--current-top);
  width: fit-content;
  padding: 5px;
}

#video-icon-dummy {
  pointer-events: none;
  visibility: hidden;
}

#tools {
  z-index: 10;
  color: #fff;
  width: 100%;

  .opacity-range {
    width: 50vw;
  }

  .clickable {
    cursor: pointer;
  }

  select {
    background: white;
    color: black;
    border-radius: 3px;
  }
}

.opacity-range {
  pointer-events: auto;
  width: 95%;
  align-items: center;

}


.tool-container {
  display: flex;
  width: 99%;
  flex-direction: row;
  align-items: center;
  gap: 5px;
  pointer-events: auto;
}

/* .folder-view {
  max-height: calc(100% - 150px);
  width: ~"min(160px, 35vw)";
} */

#controls {
  background: black;
  padding: 10px;
  border-radius: 10px;
  border: solid 1px var(--color-default2);
  display: flex;
  flex-direction: column;
  align-self: flex-end;
  margin-right: 1rem;
  margin-bottom: 1rem;
  pointer-events: auto;

  .v-label {
    color: var(--color-default2);
    opacity: 1;
  }

  .controls-content {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;

    .v-btn {
      align-self: center;
      padding-left: 5px;
      padding-right: 5px;
      border: solid 1px #899499;

      &:focus {
        border: 2px solid white;
      }
    }

    .v-btn__content {
      color: black;
      font-weight: 900;
      font-size: 0.75em;
      white-space: break-spaces;
      width: 150px;
    }
    
  }

  #controls-top-row {
    display: flex;
    width: 100%;
    flex-direction: row;
    justify-content: flex-end;
  }
}

#show-controls {
  color: var(--color-default);
}

#credits {
  color: #ddd;
  font-size: calc(0.7em + 0.2vw);
  justify-self: flex-end;
  align-self: flex-end;
  display: flex;
  justify-content: center;
  align-items: center;

  p {
    margin: 0;
    padding: 0;
    line-height: 1;
  }

  a {
    text-decoration: none;
    color: #fff;
    pointer-events: auto;

    &:hover {
      text-decoration: underline;
    }

    &[class^="share-network"]:hover {
      text-decoration: none;
      filter: brightness(75%);
    }
  }

  img {
    height: 35px;
    vertical-align: middle;
    margin: 2px;
  }

  @media only screen and (max-width: 600px) {
  img {
    height: 24px;
  }
}

  svg {
    vertical-align: middle;
    height: 24px;
  }
}

.v-selection-control--focus-visible .v-selection-control__input::before {
  opacity: 0.25;
}

.ui-text {
  color: var(--color-default);
  background: black;
  padding: 5px 5px;
  border: 2px solid black;
  border-radius: 10px;
  font-size: calc(0.8em + 0.25vw);
  pointer-events: auto;

  &:focus {
    color: var(--color-default2);
  }
  
  &:hover {
    box-sizing: content-box;
    box-shadow: 0px 0px 6px 0px #45aecb;
    transition: all 200ms ease-out;
  }
}

.slider-label {
  font-weight: bold;
  font-size: calc(0.8em + 0.5vw);
  padding: 5px 10px;
  text-align: center;
  line-height: 20px;

  .light-type {
    font-size: calc(0.56em + 0.35vw);
  }

  &:hover {
    cursor: pointer;
  }
}

.ui-button {
  text-align: center;
  color: var(--color-default);
  background: black;
  padding: 5px 5px;
  border: 2px solid var(--color-default);
  border-radius: 10px;
  font-size: calc(0.7em + 0.2vw);
  user-select: none;
}

.clickable {
  pointer-events: auto;

  &:hover {
    cursor: default;
  }
}

#buttons-container {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-self: flex-end;
}

#center-view-button {
  margin-bottom: 25px;
}

#right-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.video-wrapper {
  height: 100%;
  background: black;
  text-align: center;
  z-index: 1000;
}

video {
  height: 100%;
  width: auto;
  max-width: 100%;
  object-fit: contain;
}

#video-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  max-width: 100%;
  overflow: hidden;
  padding: 0px;
  z-index: 1000;
}

.bottom-sheet {
  .v-overlay__content {
    align-self: flex-end;
    padding: 0;
    margin: 0;
    max-width: 100%;
    height: 34%;
  }
}

#tabs {
  width: calc(100% - 3em);
  align-self: left;
}

.info-text {
  height: 33vh;
  padding-bottom: 25px;

  & a {
    text-decoration: none;
  }
}

.close-icon {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 15;

  &:hover {
    cursor: pointer;
  }

  &:focus {
    color: white;
    border: 2px solid white;
  }
}

.scrollable-container {
  overflow: hidden;
}

#tab-items {
  // padding-bottom: 2px !important;

  .v-card-text {
    font-size: ~"max(14px, calc(0.7em + 0.3vw))";
    padding-top: ~"max(2vw, 16px)";
    padding-left: ~"max(4vw, 16px)";
    padding-right: ~"max(4vw, 16px)";

    .end-spacer {
      height: 25px;
    }
  }

}

#close-text-icon {
  position: absolute;
  top: 0.25em;
  right: calc((3em - 0.6875em) / 3); // font-awesome-icons have width 0.6875em
  color: white;
}

// This prevents the tabs from having some extra space to the left when the screen is small
// (around 400px or less)
.v-tabs:not(.v-tabs--vertical).v-tabs--right>.v-slide-group--is-overflowing.v-tabs-bar--is-mobile:not(.v-slide-group--has-affixes) .v-slide-group__next, .v-tabs:not(.v-tabs--vertical):not(.v-tabs--right)>.v-slide-group--is-overflowing.v-tabs-bar--is-mobile:not(.v-slide-group--has-affixes) .v-slide-group__prev {
  display: none;
}

// Styling the slider

#sliderlabel {
  padding: 5px 10px;
  margin:0 5px;
  color:#fff !important;
  background-color: rgba(214, 4, 147,0.7);
  overflow: visible;
}

#slider {
  width: 100% !important;
  margin: 5px 30px;
}

.vue-slider-process {
  background-color: white !important;
}

.vue-slider-dot-tooltip-inner {
  cursor: grab;
  padding: 4px 10px !important;
  color: white !important;
  background-color: #9A2976 !important;
  border: 1px solid #9A2976 !important;

  &:active {
    cursor: grabbing;
  }
}

.vue-slider-dot-handle {
  cursor: grab;
  background-color: #9A2976 !important;
  border: 1px solid black !important;

  &:active {
    cursor: grabbing;
  }
}

.mark-line {
  position: absolute;
  height: 20px;
  width: 2px;
  margin: 0;
  background-color: var(--color-default);
  transform: translateX(-50%) translateY(calc(-50% + 2px));

}

.left-content {
  position: absolute;
  left: 1rem;
  top: 1rem;
  pointer-events: none;
  height: calc(100% - 2rem);
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

@media(max-width: 600px) {
  .mark-line {
    display: none;
  }

  #location-selector {
    width: 80vw;
    height: 85vh;
  }

  #video-container {
    display: inherit;
  }

  #map-container {
    width: 70vw;
  }
}


#splash-overlay {
  position: fixed;
  //  vue components are flex, so we can easy center
  align-items: center;
  justify-content: center;
}


#splash-screen {
  // for some reason the view props don't work
  // for max-width and max-height
  // splash image size 1908 × 2040 px
  max-width: calc(min(90vw,1908px)); 
  max-height: calc(min(90vh,2040px)); 
  /* prevent the image from being stretched */
  object-fit: contain;
}

#splash-close {
  // outline: 1px solid rgba(255, 255, 255, 0.094);
  position: absolute;
  width: 7%;
  height: 8%;
  top: 4%;
  left: 84%;

  &:hover {
    cursor: pointer;
  }
}

#overlays {
  margin: 5px;
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
}

ul.text-list {
  margin-left:1em;
  margin-top: 0.5em;
}

div.credits {
  font-size: 0.8em;
}

// For styling the time picker
// See more info here:
// https://vue3datepicker.com/customization/theming/
.dp__theme_dark {
  --dp-background-color: black !important;
}

.dp__main {
  width: 175px;
}

* {
  --v-input-control-height: 40px;
}

// :root {
//   --map-tiles-filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
// }

// @media (prefers-color-scheme: dark) {
//   .map-tiles {
//     filter:var(--map-tiles-filter, none);
//   }
// }

span.ui-element-ref-comet {
  background-color: #9A2976; /* #04D6B0; */
  padding: 0em 0.1em;
  border-radius: 0.2em;
}

/* from https://www.smashingmagazine.com/2021/12/create-custom-range-input-consistent-browsers/ */
input[type="range"] {
    -webkit-appearance: inherit;
    -moz-appearance: inherit;
    appearance: inherit;
    margin: 2px;
    --track-height: 1em;
    --thumb-radius: 1.5em;
    --thumb-color: rgba(255, 255, 255);
    // --thumb-color: #444;
    --track-color: rgba(4, 147, 214, .1);
    // --thumb-border: 1px solid #899499;
    --thumb-border-width: 1px;
    --thumb-border: var(--thumb-border-width) solid rgb(255, 255, 255);
    --track-border-width: 1px;
    --track-border: var(--track-border-width) solid rgba(255, 255, 255);
    --thumb-margin-top: calc((var(--track-height) - 2*var(--track-border-width)) / 2 - (var(--thumb-radius)) / 2);
    
    &:hover {
      opacity: 1;
      --track-color: rgba(217, 234, 242,0.2);
      --thumb-color: rgba(255, 255, 255);
    }

    &:focus {
      border-radius: calc(var(--track-height) / 2);
    }
  }
  
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: inherit;
    -moz-appearance: inherit;
    appearance: inherit;
    width: var(--thumb-radius);
    height: var(--thumb-radius);
    margin-top: var(--thumb-margin-top);
    border-radius: 50%;
    background: var(--thumb-color);
    border: var(--thumb-border);
  }
  
  input[type="range"]::-moz-range-thumb {
    -webkit-appearance: inherit;
    -moz-appearance: inherit;
    appearance: inherit;
    width: var(--thumb-radius);
    height: var(--thumb-radius);
    margin-top: var(--thumb-margin-top);
    border-radius: 50%;
    background: var(--thumb-color);
    cursor: pointer;
    border: var(--thumb-border)
  }
  
  input[type="range"]::-webkit-slider-runnable-track {
    background: var(--track-color);
    /* outline: 1px solid white; */
    border-radius: calc(var(--track-height) / 2);
    border: var(--track-border);
    height: var(--track-height);
    margin-top: 0;
    padding: 0 calc((var(--track-height) - var(--thumb-radius))/2);
  }
  
  
input[type="range"]::-moz-range-track {
    background: var(--track-color);
    /* outline: 1px solid white; */
    border-radius: calc(var(--track-height) / 2);
    border: var(--track-border);
    height:var(--track-height);
    margin-top: 0;
    padding: 0 calc((var(--track-height) - var(--thumb-radius))/2);
  }











</style>
