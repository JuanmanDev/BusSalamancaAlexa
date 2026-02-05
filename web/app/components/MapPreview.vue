<script setup lang="ts">
const mapStore = useMapStore()
const geolocation = useGeolocation()
const toast = useToast()

const showUserLocationButton = computed(() => {
  const userLoc = geolocation.userLocation.value
  if (!userLoc) return false
  
  const center = mapStore.center
  
  // Calculate distance to current map center
  // mapStore.center is [lng, lat]
  const dist = geolocation.calculateDistance(
    userLoc.lat, 
    userLoc.lng, 
    center[1], 
    center[0]
  )
  
  // Show only if distance is greater than 100 meters (0.1 km)
  return dist > 0.1
})

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

</script>

<template>
  <div class="relative w-full h-[50vh] pointer-events-none" id="mapPreviewContainer">
    <!-- Map is in the background layer, so this container is just for layout and the button -->
    
    <!-- Button container with responsive positioning -->
    <!-- Mobile: Bottom-Right -->
    <!-- Desktop: Top-Right -->
    <div class="absolute bottom-4 right-4 z-10 pointer-events-auto">
      <button
        class="bg-white hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm transition-all hover:scale-105"
        @click="mapStore.setFullscreen(true)"
      >
        <UIcon name="i-lucide-maximize-2" class="w-4 h-4" />
        <span>Ver mapa completo</span>
      </button>
    </div>

    <!-- Zoom controls: Bottom-Left -->
    <div class="absolute bottom-4 left-4 z-10 pointer-events-auto flex flex-row gap-2">
      <button
        class="bg-white hover:bg-gray-100 text-gray-700 p-2 rounded-lg shadow-lg flex items-center justify-center transition-all hover:scale-105"
        @click="zoomOutAnimated()"
        title="Alejar"
      >
        <UIcon name="i-lucide-minus" class="w-5 h-5" />
      </button>
      <button
        class="bg-white hover:bg-gray-100 text-gray-700 p-2 rounded-lg shadow-lg flex items-center justify-center transition-all hover:scale-105"
        @click="zoomInAnimated()"
        title="Acercar"
      >
        <UIcon name="i-lucide-plus" class="w-5 h-5" />
      </button>

      <!-- Add another button to center on current location by the user -->
      <button
        v-if="showUserLocationButton"
        class="bg-white hover:bg-gray-100 text-gray-700 p-2 rounded-lg shadow-lg flex items-center justify-center transition-all hover:scale-105"
        @click="clickLocationButton()"
        title="Centrar en Salamanca"
      >
        <UIcon name="i-lucide-map-pin" class="w-5 h-5" />
      </button>

    </div>
  </div>
</template>
