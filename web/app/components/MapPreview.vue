<script setup lang="ts">
const props = withDefaults(defineProps<{
  height?: string
  isFallback?: boolean
}>(), {
  height: 'h-[50vh]',
  isFallback: false
})

const mapStore = useMapStore()
const geolocation = useGeolocation()
const toast = useToast()
const clickLocationButton = async () => {
  if (!geolocation.userLocation.value) {
    const success = await geolocation.requestLocation({ timeout: 7000 })
    
    if (success && geolocation.userLocation.value) {
      const loc = geolocation.userLocation.value as any
      mapStore.mapInstance?.flyTo({
        center: [loc.lng || loc.longitude, loc.lat || loc.latitude],
        zoom: 15,
        duration: 2000,
        essential: mapStore.forceAnimations
      })
    } else {
      // Handle errors
      if (geolocation.permissionDenied.value) {
        toast.add({
          title: 'Permiso denegado',
          description: 'No se pudo acceder a la ubicación. Por favor, revisa los permisos del navegador.',
          color: 'error',
          icon: 'i-lucide-alert-circle'
        })
      } else {
        // Timeout or other error
        const msg = geolocation.locationError.value === 'Request timeout' 
          ? 'No se pudo obtener la ubicación en este momento. Inténtalo de nuevo.'
          : 'Error al obtener la ubicación.'
          
        toast.add({
          title: 'Error de ubicación',
          description: msg,
          color: 'warning',
          icon: 'i-lucide-map-pin-off'
        })
      }
    }
  } else {
    // Already have location, just fly there
    const loc = geolocation.userLocation.value as any
    if (loc) {
        mapStore.mapInstance?.flyTo({
          center: [loc.lng || loc.longitude, loc.lat || loc.latitude],
          zoom: 15,
          duration: 2000,
          essential: mapStore.forceAnimations
        })
    }
  }
}

const zoomInAnimated = () => {
  const map = mapStore.mapInstance
  if (map) {
    const currentZoom = map.getZoom()
    map.flyTo({
      zoom: currentZoom + 1,
      duration: 500,
      essential: mapStore.forceAnimations,
    })
  }
}

const zoomOutAnimated = () => {
  const map = mapStore.mapInstance
  if (map) {
    const currentZoom = map.getZoom()
    map.flyTo({
      zoom: currentZoom - 1,
      duration: 500,
      essential: mapStore.forceAnimations,
    })
  }
}

onMounted(() => {
  if (!props.isFallback) {
    if (placeholder.value && placeholder.value.parentElement) {
       mapStore.registerMapPreview(placeholder.value.parentElement)
    } else {
       mapStore.registerMapPreview()
    }
  }
  mapStore.setPagePaddingFromMapPreviewContainer();

  // If we're mounted while already in fullscreen (fallback MapPreview case or during navigation),
  // immediately apply fullscreen styles since the watcher won't catch it
  if (mapStore.isFullscreen) {
    nextTick(() => {
      containerStyle.value = {
        position: 'fixed',
        top: '0px',
        left: '0px',
        width: '100%',
        height: '100%',
        zIndex: '60'
      }
    })
  }
})

onUnmounted(() => {
  if (!props.isFallback) {
    if (placeholder.value && placeholder.value.parentElement) {
       mapStore.unregisterMapPreview(placeholder.value.parentElement)
    } else {
       mapStore.unregisterMapPreview()
    }
  }
})

// Fullscreen FLIP Animation Logic
const container = ref<HTMLElement | null>(null)
const placeholder = ref<HTMLElement | null>(null)
const isTransitioning = ref(false)
const containerStyle = ref<Record<string, string>>({})
// Track whether WE triggered the fullscreen change (vs external trigger like stop/vehicle click)
const internalToggle = ref(false)

// Watch for EXTERNAL fullscreen activations (e.g. stop/vehicle click calling setFullscreen directly)
watch(() => mapStore.isFullscreen, (newVal) => {
  if (internalToggle.value) {
    // We triggered this ourselves via toggleFullscreen — skip
    internalToggle.value = false
    return
  }

  if (newVal) {
    // External entry into fullscreen — immediately set fullscreen styles (no FLIP animation,
    // since the element is already teleported/repositioned by the time this watcher runs)
    containerStyle.value = {
      position: 'fixed',
      top: '0px',
      left: '0px',
      width: '100%',
      height: '100%',
      zIndex: '60'
    }
  } else {
    // External exit from fullscreen — reset styles
    containerStyle.value = {}
  }
})

let preFullscreenRect: DOMRect | null = null

const toggleFullscreen = async () => {
  if (isTransitioning.value) return

  const el = container.value
  const place = placeholder.value
  if (!el || !place) return

  isTransitioning.value = true
  internalToggle.value = true

  if (!mapStore.isFullscreen) {
    // ENTERING Fullscreen
    // 1. Get initial position of the container
    const rect = el.getBoundingClientRect()
    // Cache the pristine DOM rect before any layout changes occur.
    // This perfectly captures the flex dimensions, media query heights, and paddings
    // to act as the target for our exit animation later.
    preFullscreenRect = rect
    
    // 2. Set initial fixed position matching current spot
    containerStyle.value = {
      position: 'fixed',
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      zIndex: '60'
    }

    // 3. Trigger state change (Teleport happens)
    mapStore.setFullscreen(true)

    // 4. Force reflow/next tick to properly apply styles after teleport
    await nextTick()
    
    // Disable transitions temporarily to snap to starting position
    el.style.transition = 'none'
    void el.offsetWidth
    
    // Enable CSS transition directly on DOM
    el.style.transition = 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)'
    
    // 5. Expand to full screen smoothly
    containerStyle.value = {
      position: 'fixed',
      top: '0px',
      left: '0px',
      width: `${window.innerWidth}px`,
      height: `${window.innerHeight}px`,
      zIndex: '60'
    }

    // 6. Cleanup after transition
    setTimeout(() => {
      isTransitioning.value = false
      el.style.transition = ''
      // Remove explicit px dimensions and rely exclusively on CSS classes (`fixed inset-0`)
      // to handle window resizing natively while in fullscreen.
      containerStyle.value = {}
    }, 500)

  } else {
    // EXITING Fullscreen
    isTransitioning.value = true
    mapStore.isExitingFullscreen = true
    internalToggle.value = false

    const currentRect = el.getBoundingClientRect()
    
    // Ensure Teleport is kept alive during transition
    isTransitioning.value = true
    mapStore.isExitingFullscreen = true
    internalToggle.value = false
    
    // 1. Instantly lock element to its exact current fullscreen viewport position
    containerStyle.value = {
      position: 'fixed',
      top: `${currentRect.top}px`,
      left: `${currentRect.left}px`,
      width: `${currentRect.width}px`,
      height: `${currentRect.height}px`,
      zIndex: '60'
    }

    // Wait for Vue to apply the inline styles and keep Teleport alive
    await nextTick()
    
    const targetRect = preFullscreenRect || place.getBoundingClientRect()
    
    // 2. Disable transitions so the lock applies instantly without animating
    el.style.transition = 'none'
    
    // 3. Force browser reflow to physically paint the locked start position
    void el.offsetWidth
    
    // 4. Enable CSS transitions directly on the DOM node to bypass Vue reactivity batching delays
    el.style.transition = 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)'

    // 5. Update reactive state to target dimensions, triggering the CSS transition smoothly
    containerStyle.value = {
      position: 'fixed',
      top: `${targetRect.top}px`,
      left: `${targetRect.left}px`,
      width: `${targetRect.width}px`,
      height: `${targetRect.height}px`,
      zIndex: '60'
    }

    // Wait for the CSS transition of both the Container and <main> to finish
    setTimeout(() => {
      // 6. Reset states and strip manual transition overrides
      el.style.transition = ''
      mapStore.setFullscreen(false)
      mapStore.isExitingFullscreen = false
      isTransitioning.value = false
      
      // 7. Clear explicit styles so the component drops back into its static relative DOM wrapper
      containerStyle.value = {}
    }, 500)
  }
}
</script>

<template>
  <div class="relative w-full pointer-events-none" :class="props.height" id="mapPreviewContainer">
    <!-- Placeholder to keep layout space when map is fullscreen/teleported -->
    <div ref="placeholder" class="absolute inset-0 pointer-events-none" :class="{ 'opacity-0': mapStore.isFullscreen }"></div>

    <Teleport to="body" :disabled="!mapStore.isFullscreen && !isTransitioning">
      <div 
        ref="container"
        
        class="overflow-hidden pointer-events-none"
        :class="[
          mapStore.isFullscreen ? 'fixed z-[60] inset-0' : 'absolute inset-0'
        ]"
        :style="containerStyle"
      >
        <!-- Default slot for custom overlaid controls (e.g. filters) -->
         <slot />

        <!-- Button container with responsive positioning -->
        <!-- Mobile: Bottom-Right -->
        <!-- Desktop: Top-Right -->
        <div class="absolute bottom-4 right-4 z-10 pointer-events-auto flex flex-col gap-2">
          <UTooltip :text="mapStore.isFullscreen ? 'Salir de pantalla completa' : 'Ver mapa completo'" :delay-duration="0">
            <UButton
              color="neutral"
              variant="solid"
              class="shadow-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-all duration-300"
              :icon="mapStore.isFullscreen ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
              @click="toggleFullscreen"
            >
              <span class="btn-label-wrap hidden sm:grid">
                <span class="btn-label" :class="mapStore.isFullscreen ? 'label-visible' : 'label-hidden'">Salir</span>
                <span class="btn-label" :class="!mapStore.isFullscreen ? 'label-visible' : 'label-hidden'">Ver mapa completo</span>
              </span>
            </UButton>
          </UTooltip>
        </div>
    
        <!-- Zoom controls: Bottom-Left -->
        <div class="absolute bottom-4 left-4 z-10 pointer-events-auto flex flex-row gap-2 transition-all duration-500">
          <UTooltip text="Alejar" :delay-duration="0">
            <UButton
              color="neutral"
              variant="solid"
              icon="i-lucide-minus"
              class="shadow-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              @click="zoomOutAnimated()"
            />
          </UTooltip>
          
          <UTooltip text="Acercar" :delay-duration="0">
            <UButton
              color="neutral"
              variant="solid"
              icon="i-lucide-plus"
              class="shadow-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              @click="zoomInAnimated()"
            />
          </UTooltip>
    
          <!-- Add another button to center on current location by the user -->
          <UTooltip text="Centrar en mi ubicación" v-if="mapStore.showUserLocationButton" :delay-duration="0">
            <UButton
              color="neutral"
              variant="solid"
              icon="i-lucide-map-pin"
              class="shadow-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              @click="clickLocationButton()"
            />
          </UTooltip>
    
          <!-- Reset Bearing (North) -->
          <UTooltip text="Restablecer Norte" v-if="Math.abs(mapStore.rotation) > 5" :delay-duration="0">
            <UButton
              color="neutral"
              variant="solid"
              icon="i-lucide-compass"
              class="shadow-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              @click="mapStore.mapInstance?.easeTo({ bearing: 0, essential: true })"
              :style="{ transform: `rotate(${mapStore.rotation * -1}deg)` }"
            />
          </UTooltip>
    
          <!-- Reset Pitch (3D) -->
          <UTooltip text="Restablecer vista 2D" v-if="mapStore.pitch > 5" :delay-duration="0">
            <UButton
              color="neutral"
              variant="solid"
              icon="i-lucide-box"
              class="shadow-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              @click="mapStore.mapInstance?.easeTo({ pitch: 0, essential: true })"
            />
          </UTooltip>
    
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style >

/* Make the brothers, al brothers and sistesr at the same level with same parent of the element #mapPreviewContainer to be pointer-events-auto include the previous elements*/

#mapPreviewContainer + *,
#mapPreviewContainer ~ * {
  pointer-events: auto;
}
#mapPreviewContainer {
  pointer-events: none;
}

/* ─── Fullscreen button label animation ─────────────────────────────────────
   Two labels are stacked in a single-column grid.
   The active label expands from 0fr → 1fr; the inactive collapses to 0fr.
   interpolate-size lets us transition to/from `auto` / `1fr` smoothly.
   ─────────────────────────────────────────────────────────────────────────── */
:root { interpolate-size: allow-keywords; }

.btn-label-wrap {
  /* Stack both labels in the same cell via subgrid-like overlap */
  display: grid;
  grid-template-columns: 1fr;   /* single column */
  grid-template-rows: auto;
  overflow: hidden;
}

.btn-label {
  /* Both labels occupy the same grid cell */
  grid-row: 1;
  grid-column: 1;
  white-space: nowrap;
  overflow: hidden;
  transition:
    max-width 0.45s cubic-bezier(0.4, 0, 0.2, 1),
    opacity   0.3s ease;
}

.label-visible {
  max-width: 200px;   /* large enough for any label */
  opacity: 1;
}

.label-hidden {
  max-width: 0;
  opacity: 0;
}

</style>
