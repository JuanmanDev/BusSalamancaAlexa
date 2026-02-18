<script setup lang="ts">
const mapStore = useMapStore()
const geolocation = useGeolocation()
const toast = useToast()



const clickLocationButton = async () => {
  if (!geolocation.userLocation.value) {
    const success = await geolocation.requestLocation({ timeout: 7000 })
    
    if (success && geolocation.userLocation.value) {
      const loc = geolocation.userLocation.value
      mapStore.mapInstance?.flyTo({
        center: [loc.lng, loc.lat],
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
    const loc = geolocation.userLocation.value
    if (loc) {
        mapStore.mapInstance?.flyTo({
          center: [loc.lng, loc.lat],
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
  mapStore.setPagePaddingFromMapPreviewContainer();
})

// Fullscreen FLIP Animation Logic
const container = ref<HTMLElement | null>(null)
const placeholder = ref<HTMLElement | null>(null)
const isTransitioning = ref(false)
const containerStyle = ref<Record<string, string>>({})

const toggleFullscreen = async () => {
  if (isTransitioning.value) return

  const el = container.value
  const place = placeholder.value
  if (!el || !place) return

  isTransitioning.value = true

  if (!mapStore.isFullscreen) {
    // ENTERING Fullscreen
    // 1. Get initial position of the container
    const rect = el.getBoundingClientRect()
    
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
    
    // 5. Expand to full screen
    // We use a small timeout to ensure the browser processes the initial fixed position frame
    // before transitioning to the new fullscreen styles
    requestAnimationFrame(() => {
      containerStyle.value = {
        position: 'fixed',
        top: '0px',
        left: '0px',
        width: '100%',
        height: '100%',
        zIndex: '60'
      }
    })

    // 6. Cleanup after transition
    setTimeout(() => {
      isTransitioning.value = false
      // Keep style as is for fullscreen
    }, 500)

  } else {
    // EXITING Fullscreen
    
    // 1. Signal that we are exiting, so layout shows the main content (and thus our placeholder)
    mapStore.isExitingFullscreen = true
    
    // 2. Wait for layout to render placeholder
    await nextTick()
    
    // 2b. Get target rect from placeholder (which should now be in the flow)
    const targetRect = place.getBoundingClientRect()

    // 3. Animate back to placeholder position
    containerStyle.value = {
      position: 'fixed',
      top: `${targetRect.top}px`,
      left: `${targetRect.left}px`,
      width: `${targetRect.width}px`,
      height: `${targetRect.height}px`,
      zIndex: '60'
    }

    // 4. Wait for transition
    setTimeout(async () => {
      // 5. Reset state
      mapStore.setFullscreen(false)
      mapStore.isExitingFullscreen = false
      isTransitioning.value = false
      
      // 6. Clear explicit styles so it reverts to relative layout
      containerStyle.value = {}
    }, 500)
  }
}
</script>

<template>
  <div class="relative w-full h-[50vh] pointer-events-none" id="mapPreviewContainer">
    <!-- Placeholder to keep layout space when map is fullscreen/teleported -->
    <div ref="placeholder" class="absolute inset-0 pointer-events-none" :class="{ 'opacity-0': mapStore.isFullscreen }"></div>

    <Teleport to="body" :disabled="!mapStore.isFullscreen">
      <div 
        ref="container"
        
        class="overflow-hidden pointer-events-none"
        :class="[
          mapStore.isFullscreen ? 'fixed z-[60]' : 'absolute inset-0',
          isTransitioning ? 'transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)' : ''
        ]"
        :style="containerStyle"
      >
        <!-- Button container with responsive positioning -->
        <!-- Mobile: Bottom-Right -->
        <!-- Desktop: Top-Right -->
        <div class="absolute bottom-4 right-4 z-10 pointer-events-auto flex flex-col gap-2 transition-all duration-500">
          <UTooltip :text="mapStore.isFullscreen ? 'Salir de pantalla completa' : 'Ver mapa completo'" :delay-duration="0">
            <UButton
              color="neutral"
              variant="solid"
              class="shadow-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-all duration-300"
              :icon="mapStore.isFullscreen ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
              @click="toggleFullscreen"
            >
              <div 
                class="grid items-center transition-[grid-template-columns] duration-500 ease-in-out" 
                :style="{ 'grid-template-columns': mapStore.isFullscreen ? '1fr 0fr' : '0fr 1fr' }"
              >
                <div class="overflow-hidden min-w-0 transition-opacity duration-300" :class="mapStore.isFullscreen ? 'opacity-100' : 'opacity-0'">
                  <span class="whitespace-nowrap px-1">
                    Salir
                  </span>
                </div>
                <div class="overflow-hidden min-w-0 transition-opacity duration-300" :class="!mapStore.isFullscreen ? 'opacity-100' : 'opacity-0'">
                  <span class="whitespace-nowrap px-1">
                    Ver mapa completo
                  </span>
                </div>
              </div>
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

</style>
