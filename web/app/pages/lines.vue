<script setup lang="ts">
useSeoMeta({
  title: 'Todas las líneas - Bus Salamanca',
  description: 'Listado de todas las líneas de autobús de Salamanca',
})

const router = useRouter()
const storage = useStorage()
const mapStore = useMapStore()

// Search
const searchQuery = ref('')

// Load lines
const { data: allLines, status } = await useBusLines()

const isLoading = computed(() => status.value === 'pending')

// Filtered lines
const filteredLines = computed(() => {
  if (!allLines.value) return []
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return allLines.value
  
  return allLines.value.filter(l => 
    l.name.toLowerCase().includes(query) || 
    l.id.includes(query)
  )
})

function goToLine(line: { id: string; name: string }) {
  storage.addRecent('line', line.id, line.name)
  router.push(`/line/${line.id}`)
}

function toggleFavorite(line: { id: string; name: string }) {
  storage.toggleFavorite('line', line.id, line.name)
}

// Set map context on mount
onMounted(() => {
  mapStore.setContextToLinesListPage()
})
</script>

<template>
  <div class="md:flex md:min-h-full relative">
    <!-- MapPreview: hidden on mobile, left sticky on desktop -->
    <div class="hidden md:block md:flex-1 md:sticky md:top-16 md:h-[calc(100vh-4rem)] shrink-0 md:order-first z-0">
      <MapPreview height="h-[50vh] md:h-full" />
    </div>

    <!-- Content (right side on desktop, full width on mobile) -->
    <div class="w-full md:w-[400px] lg:w-[450px] shrink-0 px-4 py-6 space-y-4 pointer-events-auto relative z-10 ml-auto" id="mapPreviewContainer__">
    <!-- Header -->
    <div class="glass-card p-5">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        Líneas de autobús
      </h1>
      <p class="text-gray-500 dark:text-gray-400">
        {{ allLines?.length || 0 }} líneas disponibles
      </p>
    </div>

    <!-- Search -->
    <div class="glass-card p-4">
      <SearchInput
        v-model="searchQuery"
        placeholder="Buscar por número o nombre..."
      />
    </div>

    <!-- Lines list -->
    <div class="glass-card p-4">
      <BusLines
        :lines="filteredLines"
        :loading="isLoading"
        :show-favorite="true"
        @select="goToLine"
        @toggle-favorite="toggleFavorite"
      />
    </div>
    </div>
  </div>
</template>
