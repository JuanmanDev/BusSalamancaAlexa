<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [query: string]
  close: []
}>()

const inputRef = ref<HTMLInputElement>()
const isOpen = ref(false)
const metaSymbol = ref('⌘') 

onMounted(() => {
  if (typeof navigator !== 'undefined') {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    metaSymbol.value = isMac ? '⌘' : 'Ctrl'
  }
})

const busService = useBusService()
const router = useRouter()
const storage = useStorage()

// Load data for search
const { data: allStops } = await useBusStops()
const { data: allLines } = await useBusLines()

// Helper to normalize strings (remove accents, lowercase)
function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

// Search results
const results = computed(() => {
  const rawQuery = props.modelValue.trim()
  if (!rawQuery || rawQuery.length < 1) return { stops: [], lines: [] }
  
  const query = normalizeText(rawQuery)

  const stops = (allStops.value || [])
    .filter(s => {
      const name = normalizeText(s.name)
      const id = normalizeText(s.id)
      return name.includes(query) || id.includes(query)
    })
    .slice(0, 5)

  const lines = (allLines.value || [])
    .filter(l => {
      const name = normalizeText(l.name)
      const id = normalizeText(l.id)
      return name.includes(query) || id === query // Exact match for ID usually better for lines
    })
    .slice(0, 5)

  return { stops, lines }
})

const hasResults = computed(() => 
  results.value.stops.length > 0 || results.value.lines.length > 0
)

function openSearch() {
  isOpen.value = true
  nextTick(() => inputRef.value?.focus())
}

function closeSearch() {
  isOpen.value = false
  emit('update:modelValue', '')
  emit('close')
}

function goToStop(stop: { id: string; name: string }) {
  storage.addRecent('stop', stop.id, stop.name)
  router.push(`/stop/${stop.id}`)
  closeSearch()
}

function goToLine(line: { id: string; name: string }) {
  storage.addRecent('line', line.id, line.name)
  router.push(`/line/${line.id}`)
  closeSearch()
}

// Keyboard shortcut
onMounted(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      openSearch()
    }
    if (e.key === 'Escape' && isOpen.value) {
      closeSearch()
    }
  }
  window.addEventListener('keydown', handler)
  onUnmounted(() => window.removeEventListener('keydown', handler))
})
</script>

<template>
  <div class="relative">
    <!-- Search trigger button -->
    <button
      v-if="!isOpen"
      class="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-all text-sm"
      @click="openSearch"
    >
      <UIcon name="i-lucide-search" class="w-4 h-4" />
      <span class="hidden sm:inline">Buscar</span>
      <kbd class="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/10 rounded text-xs select-none">
        <span class="text-xs">{{ metaSymbol }}</span><span>K</span>
      </kbd>
    </button>

    <!-- Search modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div 
          v-if="isOpen"
          class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]"
          @click.self="closeSearch"
        >
          <div class="w-full max-w-lg mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4">
            <!-- Search input -->
            <div class="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
              <UIcon name="i-lucide-search" class="w-5 h-5 text-gray-400" />
              <input
                ref="inputRef"
                type="text"
                :value="modelValue"
                placeholder="Buscar parada o línea..."
                class="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none text-lg"
                @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
              />
              <button
                class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                @click="closeSearch"
              >
                <UIcon name="i-lucide-x" class="w-5 h-5" />
              </button>
            </div>

            <!-- Results -->
            <div class="max-h-80 overflow-y-auto">
              <template v-if="hasResults">
                <!-- Lines -->
                <div v-if="results.lines.length > 0" class="p-2">
                  <p class="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Líneas
                  </p>
                  <button
                    v-for="line in results.lines"
                    :key="`line-${line.id}`"
                    class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                    @click="goToLine(line)"
                  >
                    <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex items-center justify-center shrink-0">
                      <span class="text-lg font-bold text-primary-600 dark:text-primary-400">{{ line.id }}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {{ line.name }}
                      </p>
                    </div>
                  </button>
                </div>

                <!-- Stops -->
                <div v-if="results.stops.length > 0" class="p-2">
                  <p class="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Paradas
                  </p>
                  <button
                    v-for="stop in results.stops"
                    :key="`stop-${stop.id}`"
                    class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                    @click="goToStop(stop)"
                  >
                    <div class="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                      <UIcon name="i-lucide-map-pin" class="w-5 h-5 text-gray-500" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {{ stop.name }}
                      </p>
                      <p class="text-xs text-gray-500">Parada {{ stop.id }}</p>
                    </div>
                  </button>
                </div>
              </template>

              <!-- No results -->
              <div 
                v-else-if="modelValue.length > 0"
                class="p-8 text-center text-gray-500 dark:text-gray-400"
              >
                <UIcon name="i-lucide-search-x" class="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No se encontraron resultados</p>
              </div>

              <!-- Empty state -->
              <div 
                v-else
                class="p-6 text-center text-gray-500 dark:text-gray-400"
              >
                <p class="text-sm">Escribe para buscar paradas o líneas</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style>
.animate-in {
  animation: animate-in 0.2s ease-out;
}

.slide-in-from-top-4 {
  --tw-enter-translate-y: -1rem;
}

@keyframes animate-in {
  from {
    opacity: 0;
    transform: translateY(var(--tw-enter-translate-y, 0));
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
