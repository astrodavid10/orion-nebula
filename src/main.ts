import Vue, { createApp } from "vue";

import LayeredImagery from "./MainContent.vue";
import FolderView from "./FolderView.vue";
import TransitionExpand from "./TransitionExpand.vue";

import VueSlider from "vue-slider-component";
import 'vue-slider-component/theme/default.css';

import Datepicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';

import vuetify from "../plugins/vuetify";

import './assets/Roboto.ttf';
import './assets/RobotoCondensed.ttf';

import { WWTComponent, wwtPinia } from "@wwtelescope/engine-pinia";

import Notifications from '@kyvg/vue3-notification';

import "leaflet/dist/leaflet.css";

/** v-hide directive taken from https://www.ryansouthgate.com/2020/01/30/vue-js-v-hide-element-whilst-keeping-occupied-space/ */
// Extract the function out, up here, so I'm not writing it twice
const update = (el: HTMLElement, binding: Vue.DirectiveBinding) => el.style.visibility = (binding.value) ? "hidden" : "";

createApp(LayeredImagery, {
  wwtNamespace: "wwt-minids-layeredimagery",
  wtml: { // images are listed in chronological order earliest to latest
    layeredimagery: "http://data1.wwtassets.org/packages/2023/10_jwst/OrionNebula_v10.wtml",
  },
  url: "https://web.wwtassets.org/specials/2023/orion/",
  thumbnailUrl: "https://cdn.worldwidetelescope.org/thumbnails/jwst.jpg",
  bgWtml: "https://data1.wwtassets.org/packages/2023/04_casA/StudyBackgroundImagery.wtml",
  fgName: "unWISE",
  bgName: "Digitized Sky Survey",
  title: "ORION NEBULA",
  introTitle: "Interactively Explore Orion Nebula Imagery!",
  introText: `The Orion Nebula is one of the most scrutinized and photographed objects in the 
  night sky and is among the most intensely studied celestial features. This nebula has revealed 
  much about the process of how stars and planetary systems are formed from collapsing clouds 
  of gas and dust. Astronomers have directly observed protoplanetary disks and brown dwarfs within 
  the nebula, intense and turbulent motions of the gas, and the photo-ionizing effects of massive 
  nearby stars in the nebula.`,
  introInstructions: `Pan and zoom to explore the images. 
  Select the thumbnails to view Orion Nebula astro-imagery 
  in context of the sky. Using the menu (top right), change the background imagery to compare 
  against different surveys and wavelengths.`
})

  // Plugins
  .use(wwtPinia)
  .use(vuetify)
  .use(Notifications)

  // Directives
  .directive(
    /**
    * Hides an HTML element, keeping the space it would have used if it were visible (css: Visibility)
    */
    "hide", {
      // Run on initialisation (first render) of the directive on the element
      beforeMount(el, binding, _vnode, _prevVnode) {
        update(el, binding);
      },
      // Run on subsequent updates to the value supplied to the directive
      updated(el, binding, _vnode, _prevVnode) {
        update(el, binding);
      }
    })

  // Components
  .component("WorldWideTelescope", WWTComponent)

  .component('folder-view', FolderView)
  .component('vue-slider', VueSlider)
  .component('date-picker', Datepicker)

  // Mount
  .mount("#app");
