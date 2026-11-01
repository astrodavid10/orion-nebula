import { createApp, defineAsyncComponent } from "vue";

import OrionViewer from "./orion-viewer.vue";
import TransitionExpand from "./TransitionExpand.vue";
import { tip as tipDirective } from "./tooltip";
import { boolParam } from "./urlParams";
import "./assets/common.less";

import vuetify from "../plugins/vuetify";

import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

import { WWTComponent, wwtPinia } from "@wwtelescope/engine-pinia";

import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faBookOpen,
  faTimes,
  faChevronDown,
  faChevronUp,
  faChevronLeft,
  faChevronRight,
  faGear,
  faStar,
  faInfoCircle,
  faExpand,
  faCompress,
  faSlidersH,
  faRocket,
  faGlobe,
  // Badge / filter-chip icons (see src/layerTypes.ts) and shared UI icons.
  faStarOfLife,
  faCompactDisc,
  faCloud,
  faCircleDot,
  faBurst,
  faBraille,
  faHurricane,
  faCircleNodes,
  faLayerGroup,
  faBolt,
  faTableCells,
  faRing,
  faArrowsAlt,
  faCheck,
  faImage,
  faMagnifyingGlass,
  // Menu, tour and share controls (one icon per action).
  faRoute,
  faPanorama,
  faVectorSquare,
  faBuildingColumns,
  faSatellite,
  faArrowUpRightFromSquare,
  faShareNodes,
  faTriangleExclamation,
  // Orion: layer badges and publication links.
  faNewspaper,
  faSatelliteDish,
  faMountain,
  faCamera,
  // Layer panel controls.
  faEye,
  faEyeSlash,
  faBullseye,
} from "@fortawesome/free-solid-svg-icons";

// Canonical public URL of the deployed site, set at build time
// (VUE_APP_PUBLIC_URL in .env.production.local or the CI environment). The
// kiosk's take-home QR encodes it; when it's empty the QR falls back to the
// current URL, which is wrong for a kiosk served from localhost or a LAN, and
// kiosk mode shows a staff warning (audit J2).
const PUBLIC_URL = process.env.VUE_APP_PUBLIC_URL ?? "";

// ?kioskStats=1 → mount the standalone usage-stats panel instead of the WWT
// viewer (no engine/pinia/vuetify/FontAwesome boot needed). See kioskStats.ts.
// Loaded as a separate chunk so ordinary visitors never download it (J23).
if (boolParam("kioskStats")) {
  createApp(defineAsyncComponent(() => import("./KioskStatsPanel.vue"))).mount("#app");
} else {
  library.add(
    faBookOpen, faTimes, faChevronDown, faChevronUp, faChevronLeft, faChevronRight,
    faGear, faStar, faInfoCircle, faExpand, faCompress, faSlidersH, faRocket, faGlobe,
    faStarOfLife, faCompactDisc, faCloud, faCircleDot, faBurst, faBraille, faHurricane,
    faCircleNodes, faLayerGroup, faBolt, faTableCells, faRing, faArrowsAlt, faCheck,
    faImage, faMagnifyingGlass,
    faRoute, faPanorama, faVectorSquare, faBuildingColumns, faSatellite, faArrowUpRightFromSquare,
    faShareNodes, faTriangleExclamation,
    faNewspaper, faSatelliteDish, faMountain, faCamera,
    faEye, faEyeSlash, faBullseye,
  );

  createApp(OrionViewer, {
    wwtNamespace: "wwt-orion-nebula",
    // OrionNebula_v10.wtml (2023), bundled with every URL upgraded to https
    // (audit O5). public/orion.wtml.
    wtml: "orion.wtml",
    bgWtml: "https://data1.wwtassets.org/packages/2023/06_pas/BackgroundImagery_v2.wtml",
    // All-sky base under the layer stack: NASA Deep Star Maps 2020 (optical).
    // Visitors can still switch surveys from the menu.
    bgName: "Deep Star Maps 2020",
    introTitle: "Explore the Orion Nebula",
    // The 2023 app opened on this layer (FolderView items[4]).
    startImage: "JWST - NIRCam Short-wavelength",
    kioskMode: boolParam("kiosk"),
    kioskHomeUrl: PUBLIC_URL,
  })

    // Plugins
    .use(wwtPinia)
    .use(vuetify)

    // Themed replacement for native `title` tooltips (see src/tooltip.ts).
    .directive("tip", tipDirective)

    // Components
    .component("WorldWideTelescope", WWTComponent)
    .component("font-awesome-icon", FontAwesomeIcon)
    .component("transition-expand", TransitionExpand)

    // Mount
    .mount("#app");
}
