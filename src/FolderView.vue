<template>
  <div
    class="fv-root"
    :style="cssVars"
  >
    <transition-expand>
      <div class="item-container">

      <div id="items">
        <div
          v-if="items !== null && expanded"
        >
          <div
            :class="['bordered', 'item', lastSelectedItem === item ? 'selected' : '']"
            v-for="item of items"
            :key="item.get_name()"
            :title="item.get_name()"
            :id="`fv-${item.get_name()}`"
          >
            <div
              class="item-thumbnails"
            >
              <img
                v-if="thumbnails"
                :src="item.get_thumbnailUrl()"
                :alt="item.get_name()"
                @click="() => selectItem(item)"
              />

              <div
                class="item-name"
                :class="['thumbnail']"
                @click="() => selectItem(item)"
              >
                {{item.get_name()}}
              </div>
            </div>

            <div class="slider-container">
              <input
                v-if="sliders"
                type="range"
                v-model="opacities[item.get_name()]"
                @input="(e) => onSliderInputChanged(e, item)"
                @keyup.enter="() => selectItem(item)"
                @mouseup="() => { lastOpacityChanged = null }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    </transition-expand>
  </div>
</template>

<script lang="ts">
  import { defineComponent, isProxy, toRaw, PropType } from "vue";
  import { Folder, FolderUp, Place, Imageset } from "@wwtelescope/engine";
  import { Thumbnail } from "@wwtelescope/engine-types";
  import { WWTAwareComponent } from "@wwtelescope/engine-pinia";
  
  type FlexDirection = "row" | "column";
  
  
  export default defineComponent({
    extends: WWTAwareComponent,
  
    name: 'MyComponent',
      
    props: {
      rootFolder: {
        type: Object as PropType<Folder>,
        required: true
      },
      flexDirection: {
        type: String as PropType<FlexDirection>,
        default: "column"
      },
      expandable: {
        type: Boolean,
        default: false
      },
      sliders: {
        type: Boolean,
        default: false
      },
      startFirstSelected: {
        type: Boolean,
        default: true
      },
      thumbnails: {
        type: Boolean,
        default: true
      },
      open: {
        type: Boolean,
        default: false
      },
      incomingItemSelect: {
        type: Object as PropType<Thumbnail>,
        default: null
      },
    },
  
    data() {
      return {
        items: [] as Thumbnail[],
        lastSelectedItem: null as Thumbnail | null,
        opacities: {} as Record<string, number>,
        expanded: this.open,
        lastOpacityChanged: null as Thumbnail | null,
      };
    },
  
    created() {
      this.populate();
    },
  
    methods: {

      populate(): void {
        for (const c of this.rootFolder.get_children() ?? []) {
          const cr = isProxy(c) ? toRaw(c) : c;
          if (cr instanceof Place) {
            this.items.push(cr);
            this.opacities[cr.get_name()] = 100;
          }
        }
        if (this.startFirstSelected && this.items?.length > 0) {
          this.selectItem(this.items[4]); 
          //change items[#] to start on a desired image
        }
      },

      showSlider(item: Thumbnail | null): boolean {
        return item instanceof Imageset;
      },

      selectItem(item: Thumbnail): void {
        this.lastSelectedItem = item;
        if (item instanceof Folder || item instanceof FolderUp) {
          this.items = item.get_children() ?? [];
          
        } else {
          this.opacities[item.get_name()] = 100;
          this.$emit('select', item);
          //this.$emit('opacity', item, 100, false);
          //this.$emit('opacity', item);
        }
      },

      onSliderInputChanged(e: Event, item: Thumbnail) {
        let dragging = false;
        if (this.lastOpacityChanged == item) {
          dragging = true;
        } else {
          this.lastOpacityChanged = item;
        }
        this.$emit('opacity', item, (e.target as HTMLInputElement).value, !dragging);
      },

      onToggleImage(e: Event, item: Thumbnail) {
        this.$emit('toggle', item, (e.target as HTMLInputElement).checked);
      },
  
      scrollToItem(id: string) {
        const element = document.getElementById(id);
        if (element !== null) {
          const container = document.getElementById("items");
          if (container !== null) {
            console.log(element.clientHeight);
            const y = Math.max(Math.min(element.offsetTop - element.clientHeight * 1.5, container.scrollHeight), 0);
            container.scrollTo(0, y);
          }
        }
      },
    },
  
    computed: {
      cssVars() {
        return {
          "--flex-direction": this.flexDirection
        };
      },
  
      isMobile() {
        return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
      },
    },
  
    watch: {
      incomingItemSelect() {
        if (this.incomingItemSelect != null) {
          this.lastSelectedItem = this.incomingItemSelect;
          this.scrollToItem(`fv-${this.incomingItemSelect.get_name()}`);
        } else {
          this.lastSelectedItem = null;
        }
      }
    }
  });
  </script>

<style scoped lang="less">  

.item-container {
  background-color: rgba(0, 60, 135, 0.50);
  border-radius: 5px;
  max-height: calc(75vh - 9rem); //calc(100vh - 26.5rem);
  left: 0.5rem;
  overflow-y: scroll;
  padding: 5px;
  position: absolute;
  top: 5.5rem;
  width: 6.7rem;
}

.item-container::-webkit-scrollbar {
  background-color: transparent;
  width: 0px;
}

.item-container::-moz-scrollbar {
  overflow: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.item-container::-webkit-scrollbar-track {
  background-color: transparent;
}

.item-container::-webkit-scrollbar-thumb {
  background-color: #ffffff76;
  border-radius: 4px;
}

.item-container-content {
  pointer-events: none;
  position: fixed;
}

/* This changes the appearance of the container that the images are in */
.item {
  padding: 3px;
  border: 1px solid #85858698;
  border-radius: 2px;
  width: 100%;
  cursor: pointer;
  pointer-events: auto;

  & img {
    width: 5.5rem;
    object-fit: cover;
    border-radius: 2px;
  }
	
	/* &:hover {
    box-shadow: 2px 2px 3px 2px #1671e07c; 
		transition: all 200ms ease-out;
  } */
}

/* This is the text above the thumbnail images */
.item-name {
  text-align: center;  
  position: absolute;
  margin:0;
  color: rgb(255, 255, 255);
  font-size: 0.7em;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  text-shadow: 0px 0px 5px black;
  width: 100%;
  bottom: 100%;
}

/* Here we choose the placement of the thumbnail images */
.item-thumbnails {
  position: relative;
  display: inline-block;
  margin-top: 15px;
}

/* This is the container that the image's sliders are in */
.slider-container {
  position: relative;
  display: flex;

}

input[type=range]{
  width: 100%;
  -webkit-appearance: inherit;
  appearance: inherit;
  background-color: rgba(4, 147, 214, 0.119);
  border-radius: 10px;  
  --track-border-width: 1px;
  --track-border: solid rgba(255, 255, 255, 0.756);
  z-index: 111;
}

input[type="range"]::-webkit-slider-runnable-track {
  height: 70%;
  border-radius: 10px;
  border: var(--track-border);
  border-width: var(--track-border-width);
  z-index: 111;
}

input[type="range"]::-moz-range-track {
  height: 30%;
  border-radius: 10px;
  border: var(--track-border);
  border-width: var(--track-border-width);
  z-index: 111;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  margin-top: -4px;
  background-color: #ffffff;
  height: 0.8rem;
  width: 0.8rem;   
  border-radius: 10px;   
  z-index: 111;
}

input[type="range"]::-moz-range-thumb {
  -webkit-appearance: none;
  appearance: none;
  background-color: #ffffff;
  height: 0.8rem;
  width: 0.8rem;   
  border-radius: 10px;
  z-index: 111;   
}

</style>
