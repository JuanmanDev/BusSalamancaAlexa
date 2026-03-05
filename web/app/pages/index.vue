<script setup lang="ts">
import type { BusStop, BusLine } from '~/types/bus'

const { t } = useI18n()

useSeoMeta({
  title: computed(() => `${t('index.title')} - ${t('index.subtitle')}`),
  description: computed(() => t('index.subtitle')),
})

const router = useRouter()
const localePath = useLocalePath()
const storage = useStorage()
const geolocation = useGeolocation()
const mapStore = useMapStore()

const favLinesScrollContainer = ref<HTMLElement | null>(null)
const { arrivedState } = useScroll(favLinesScrollContainer)

function scrollFavLines(direction: 'left' | 'right') {
  if (!favLinesScrollContainer.value) return
  // Find first child element width approx 40% + gap
  const itemWidth = (favLinesScrollContainer.value.firstElementChild as HTMLElement)?.offsetWidth || 150
  const gap = 12 // 0.75rem or 12px
  const scrollAmount = itemWidth + gap
  
  favLinesScrollContainer.value.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
}

// Load static data
const { data: allStops, status: stopsStatus } = await useBusStops()
const { data: allLines, status: linesStatus } = await useBusLines()

const isLoading = computed(() => stopsStatus.value === 'pending' || linesStatus.value === 'pending')

// Nearby stops - sorted by distance (closest first) thanks to getNearbyStops
const nearbyStops = computed(() => {
  if (!geolocation.userLocation.value || !allStops.value) return []
  return geolocation.getNearbyStops(allStops.value, 2000).slice(0, 5)
})

// Location state derived from geolocation
const locationState = computed(() => {
  if (geolocation.isLocating.value) return 'locating'
  if (geolocation.userLocation.value) return 'found'
  if (geolocation.permissionDenied.value) return 'denied'
  return 'idle'
})

// Enhanced recents - include destination info
interface EnhancedRecent {
  type: 'stop' | 'line'
  id: string
  name: string
  visitedAt: number
  destination?: string
  lineHint?: string
}

const enhancedRecents = computed((): EnhancedRecent[] => {
  return storage.recents.value.map(recent => {
    if (recent.type === 'line' && allLines.value) {
      const line = allLines.value.find(l => l.id === recent.id)
      return { ...recent, destination: line?.name }
    }
    if (recent.type === 'stop' && allStops.value) {
      const stop = allStops.value.find(s => s.id === recent.id)
      const firstLine = stop?.lines?.[0]
      return { ...recent, destination: stop?.name, lineHint: firstLine }
    }
    return { ...recent, destination: undefined, lineHint: undefined }
  })
})

// Navigation
function goToStop(stop: BusStop) {
  storage.addRecent('stop', stop.id, stop.name)
  router.push(localePath(`/stop/${stop.id}`))
}

function goToLine(line: BusLine) {
  storage.addRecent('line', line.id, line.name)
  router.push(localePath(`/line/${line.id}`))
}

function toggleFavoriteStop(stop: BusStop) {
  storage.toggleFavorite('stop', stop.id, stop.name)
}

function toggleFavoriteLine(line: BusLine) {
  storage.toggleFavorite('line', line.id, line.name)
}

function formatFavoriteLineName(name: string) {
  if (!name) return ''
  return name.replace(/ - /g, '<br/>').replace(/\(/g, '<br/>(')
}

// Request location handler
async function handleRequestLocation() {
  const success = await geolocation.requestLocation()
  if (!success && geolocation.isTooFar.value) {
    useToast().add({
      title: 'Ubicación lejana',
      description: 'Estás a más de 15km de Salamanca.',
      icon: 'i-lucide-map-pin-off',
      color: 'warning'
    })
  }
}

// Route Search
function navigateToSearch() {
  router.push(localePath('/route'))
}

// Set map context on mount
onMounted(async () => {
  await mapStore.setContextToHomePage()
})
</script>

<template>
  <div class="md:flex md:min-h-full">
    <!-- MapPreview: inline on mobile, left sticky on desktop -->
    <div class="md:flex-1 md:sticky md:top-16 md:h-[calc(100vh-4rem)] shrink-0 md:order-first z-0">
      <MapPreview height="h-[50vh] md:h-full" />
    </div>

    <!-- Content (right side on desktop, full width on mobile) -->
    <div class="w-full md:w-[400px] lg:w-[450px] shrink-0 px-4 py-6 space-y-6 pointer-events-auto relative z-10">
      <!-- Hero section -->
      <div class="glass-card text-center py-6 px-4">
        <h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          {{ $t('index.title') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          {{ $t('index.subtitle') }}
        </p>
      </div>

      <!-- Loading state -->
      <div v-if="isLoading" class="glass-card p-6">
        <LoadingSpinner size="lg" :text="$t('general.loading')" />
      </div>

      <!-- Favorites -->
      <div 
        v-if="storage.favoriteStops.value.length > 0 || storage.favoriteLines.value.length > 0"
        class="glass-card p-5"
      >
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-star" class="w-5 h-5 text-amber-500" />
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ $t('index.favorites') }}</h2>
        </div>

        <!-- Favorite stops -->
        <div v-if="storage.favoriteStops.value.length > 0" class="mb-4">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{{ $t('nav.stops') }}</h3>
          <div class="grid grid-cols-1 gap-3">
            <NuxtLink
              v-for="fav in storage.favoriteStops.value"
              :key="`stop-${fav.id}`"
              :to="localePath(`/stop/${fav.id}`)"
              class="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 hover:bg-white dark:hover:bg-gray-800 transition-all"
              :style="{ viewTransitionName: `stop-${fav.id}` }"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex items-center justify-center shrink-0">
                  <span class="font-bold text-primary-600 dark:text-primary-400 text-sm">{{ fav.id }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-gray-900 dark:text-white truncate text-sm">{{ fav.name }}</p>
                </div>
                <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-gray-400 shrink-0" />
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- Favorite lines -->
        <div v-if="storage.favoriteLines.value.length > 0">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{{ $t('nav.lines') }}</h3>
          
          <!-- 1 or 2 lines layout -->
          <div v-if="storage.favoriteLines.value.length <= 2" class="flex flex-col gap-3">
            <NuxtLink
              v-for="fav in storage.favoriteLines.value"
              :key="`line-${fav.id}`"
              :to="localePath(`/line/${fav.id}`)"
              class="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 hover:bg-white dark:hover:bg-gray-800 transition-all flex items-center gap-3"
              :style="{ viewTransitionName: `line-${fav.id}` }"
            >
              <div 
                class="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0"
                :class="getLineColor(fav.id)"
              >
                <span class="text-lg font-bold">{{ fav.id }}</span>
              </div>
              <p class="text-xs text-gray-500 flex-1 line-clamp-3" v-html="formatFavoriteLineName(fav.name)"></p>
            </NuxtLink>
          </div>

          <!-- 3 or more lines layout -->
          <div v-else class="relative group">
            <Transition name="fade">
              <UButton 
                v-show="!arrivedState.left" 
                icon="i-lucide-chevron-left" 
                color="neutral"
                variant="soft"
                class="absolute -left-3 top-1/2 -translate-y-1/2 z-10 rounded-full shadow-md bg-white/95 dark:bg-gray-800/95 backdrop-blur aspect-square w-8 h-8 flex items-center justify-center pointer-events-auto transition-opacity"
                size="sm"
                @click.prevent="scrollFavLines('left')" 
              />
            </Transition>
            
            <div 
              ref="favLinesScrollContainer"
              class="flex overflow-x-auto snap-x snap-mandatory gap-3 hide-scrollbar pb-1 px-1"
            >
              <NuxtLink
                v-for="fav in storage.favoriteLines.value"
                :key="`line-${fav.id}`"
                :to="localePath(`/line/${fav.id}`)"
                class="bg-white/80 dark:bg-gray-800/80 rounded-lg p-3 hover:bg-white dark:hover:bg-gray-800 transition-all flex flex-col items-center gap-2 shrink-0 w-[40%] snap-start"
                :style="{ viewTransitionName: `line-${fav.id}` }"
              >
                <div 
                  class="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0"
                  :class="getLineColor(fav.id)"
                >
                  <span class="text-lg font-bold">{{ fav.id }}</span>
                </div>
                <p class="text-xs text-center text-gray-500 line-clamp-3 w-full" v-html="formatFavoriteLineName(fav.name)"></p>
              </NuxtLink>
            </div>

            <Transition name="fade">
              <UButton 
                v-show="!arrivedState.right" 
                icon="i-lucide-chevron-right" 
                color="neutral"
                variant="soft"
                class="absolute -right-3 top-1/2 -translate-y-1/2 z-10 rounded-full shadow-md bg-white/95 dark:bg-gray-800/95 backdrop-blur aspect-square w-8 h-8 flex items-center justify-center pointer-events-auto transition-opacity"
                size="sm"
                @click.prevent="scrollFavLines('right')" 
              />
            </Transition>
          </div>
        </div>
      </div>

      <!-- Nearby stops section with animations -->
      <div class="glass-card p-5 overflow-hidden">
        <Transition name="height-fade" mode="out-in">
          <!-- Location loading state -->
          <div 
            v-if="locationState === 'locating'"
            key="loading"
            class="text-center py-4"
          >
            <div class="flex flex-col items-center justify-center gap-3">
              <div class="relative">
                <UIcon 
                  name="i-lucide-navigation" 
                  class="w-10 h-10 text-primary-500 animate-bounce"
                />
                <div class="absolute inset-0 w-10 h-10 rounded-full bg-primary-500/30 animate-ping" />
              </div>
              <p class="text-gray-600 dark:text-gray-400 font-medium">
                {{ $t('index.locating') }}
              </p>
            </div>
          </div>

          <!-- Nearby stops list -->
          <div 
            v-else-if="locationState === 'found' && nearbyStops.length > 0"
            key="list"
          >
            <div class="flex items-center gap-2 mb-4">
              <UIcon name="i-lucide-navigation" class="w-5 h-5 text-primary-500" />
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ $t('index.nearby_stops') }}</h2>
              <span class="text-xs text-gray-500">{{ $t('index.closest_first') }}</span>
            </div>
            <BusStops
              :stops="nearbyStops"
              :show-distance="true"
              :show-favorite="true"
              :show-lines="true"
              @select="goToStop"
              @toggle-favorite="toggleFavoriteStop"
            />
          </div>

          <!-- No nearby stops found -->
          <div 
            v-else-if="locationState === 'found' && nearbyStops.length === 0"
            key="empty"
          >
            <div class="text-center py-4">
              <UIcon name="i-lucide-map-pin-off" class="w-10 h-10 mx-auto text-gray-400 mb-3" />
              <p class="text-gray-600 dark:text-gray-400">{{ $t('index.no_nearby_stops') }}</p>
            </div>
          </div>

          <!-- Permission denied -->
          <div 
            v-else-if="locationState === 'denied'"
            key="denied"
            class="text-center py-4"
          >
            <UIcon name="i-lucide-x-circle" class="w-10 h-10 mx-auto text-red-500 mb-3" />
            <h3 class="font-semibold text-gray-900 dark:text-white mb-2">{{ $t('index.access_denied') }}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t('index.enable_location') }}
            </p>
          </div>

          <!-- Request location button -->
          <div 
            v-else
            key="request"
            class="text-center py-4"
          >
            <UIcon name="i-lucide-map-pin" class="w-10 h-10 mx-auto text-primary-500 mb-3" />
            <h3 class="font-semibold text-gray-900 dark:text-white mb-2">{{ $t('index.activate_location') }}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {{ $t('index.find_closest_stops') }}
            </p>
            <UButton icon="i-lucide-navigation" @click="handleRequestLocation">
              {{ $t('index.activate_location_btn') }}
            </UButton>
          </div>
        </Transition>
      </div>

      <!-- Recent -->
      <div v-if="enhancedRecents.length > 0" class="glass-card p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-clock" class="w-5 h-5 text-gray-400" />
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ $t('index.recent') }}</h2>
          </div>
          <button 
            class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            @click="storage.clearRecents"
          >
            {{ $t('index.clear') }}
          </button>
        </div>
        <div class="space-y-2">
          <NuxtLink
            v-for="recent in enhancedRecents"
            :key="`${recent.type}-${recent.id}`"
            :to="localePath(recent.type === 'stop' ? `/stop/${recent.id}` : `/line/${recent.id}`)"
            class="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 rounded-lg px-4 py-3 hover:bg-white dark:hover:bg-gray-800 transition-all"
          >
            <div 
              v-if="recent.type === 'line'"
              class="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0"
              :class="getLineColor(recent.id)"
            >
              <span class="font-bold">{{ recent.id }}</span>
            </div>
            <div 
              v-else
              class="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center shrink-0"
            >
              <UIcon name="i-lucide-map-pin" class="w-5 h-5 text-gray-500" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                {{ recent.type === 'stop' ? recent.destination : recent.name }}
              </p>
              <p class="text-xs text-gray-500 truncate">
                {{ recent.type === 'stop' ? `${$t('search_modal.stop')} ${recent.id}` : `${$t('search_modal.lines')} ${recent.id}` }}
              </p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-gray-400 shrink-0" />
          </NuxtLink>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="grid grid-cols-2 gap-4">
        <NuxtLink
          :to="localePath('/lines')"
          class="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
        >
          <UIcon name="i-lucide-route" class="w-8 h-8 mb-3" />
          <h3 class="font-semibold">{{ $t('index.all_lines') }}</h3>
          <p class="text-sm text-white/80">{{ $t('index.see_itineraries') }}</p>
        </NuxtLink>

        <NuxtLink
          :to="localePath('/map')"
          class="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
        >
          <UIcon name="i-lucide-map" class="w-8 h-8 mb-3" />
          <h3 class="font-semibold">{{ $t('index.see_map') }}</h3>
          <p class="text-sm text-white/80">{{ $t('index.stops_and_buses') }}</p>
        </NuxtLink>

        <NuxtLink
          to="https://www.amazon.es/Juan-Manuel-B%C3%A9c-Bus-Salamanca/dp/B0F59TDK93/?utm_source=bussalamanca.juanman.tech&utm_compaign=home-bottom-card"
          target="_blank"
          class="col-span-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-4"
        >
          <div class="bg-white/20 p-2 rounded-xl shrink-0">
            <img src="https://m.media-amazon.com/images/I/41E21ldSofL.png" alt="Bus Salamanca Alexa Skill" class="w-12 h-12 object-contain rounded-lg" />
          </div>
          <div>
            <h3 class="font-semibold text-lg">{{ $t('index.alexa_skill') }}</h3>
            <p class="text-sm text-white/90">{{ $t('index.ask_assistant') }}</p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style>
@reference "tailwindcss";

.height-fade-enter-active,
.height-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 1000px;
  opacity: 1;
}

.height-fade-enter-from,
.height-fade-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

/* Hide scrollbar for layout components */
.hide-scrollbar {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
.hide-scrollbar::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}
</style>
