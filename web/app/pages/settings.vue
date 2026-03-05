<script setup lang="ts">
import { useMapStore } from '~/stores/map'

definePageMeta({
  layout: 'simple'
})

const colorMode = useColorMode()
const mapStore = useMapStore()
const config = useRuntimeConfig()
const { t, locale, locales, setLocale } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const router = useRouter()
const localePath = useLocalePath()

const version = config.public.version || '0.0.0'

const themeOptions = computed(() => [
  { label: t('settings.system'), value: 'system', icon: 'i-lucide-monitor' },
  { label: t('settings.light'), value: 'light', icon: 'i-lucide-sun' },
  { label: t('settings.dark'), value: 'dark', icon: 'i-lucide-moon' }
])

const languageOptions = computed(() => {
  return (locales.value || []).map(l => ({
    label: l.name,
    value: l.code
  }))
})

// To avoid hydration mismatch on themes
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

const handleThemeChange = (val: any) => {
  if (typeof val === 'string') colorMode.preference = val
}

const handleLanguageChange = (val: any) => {
  if (typeof val === 'string') {
    const link = switchLocalePath(val as any)
    if (link) {
      router.replace(link)
    } else {
      setLocale(val as any)
    }
  }
}

</script>

<template>
  <div class="max-w-2xl mx-auto p-4 md:p-8 space-y-8 pb-32">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">{{ $t('settings.title') }}</h1>
      <p class="text-gray-500 dark:text-gray-400">{{ $t('settings.subtitle') }}</p>
    </div>

    <div class="space-y-6">
      <!-- Language Settings -->
      <section class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-languages" class="w-5 h-5 text-primary-500" />
          {{ $t('settings.language') }}
        </h2>
        
        <div v-if="mounted" class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.language_desc') }}</p>
          <USelect
            :model-value="locale"
            :items="languageOptions"
            @update:model-value="handleLanguageChange"
            class="w-full sm:w-64 shrink-0"
            :ui="{ content: 'max-h-60 sm:max-h-96' }"
          />
        </div>
        <div v-else class="h-10 flex items-center justify-center">
          <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </section>

      <!-- Theme Settings -->
      <section class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-palette" class="w-5 h-5 text-primary-500" />
          {{ $t('settings.appearance') }}
        </h2>
        
        <div v-if="mounted" class="space-y-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.theme_desc') }}</p>
          <UTabs
            v-model="colorMode.preference"
            :items="themeOptions"
            @update:model-value="handleThemeChange"
            class="w-full"
          />
        </div>
        <div v-else class="h-24 flex items-center justify-center">
          <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </section>

      <!-- Map Settings -->
      <section class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-map" class="w-5 h-5 text-primary-500" />
          {{ $t('settings.map') }}
        </h2>
        
        <div class="flex items-center justify-between">
          <div>
            <span class="block font-medium text-gray-900 dark:text-white">{{ $t('settings.smooth_animations') }}</span>
            <span class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.smooth_animations_desc') }}</span>
          </div>
          <USwitch v-model="mapStore.forceAnimations" />
        </div>
      </section>

      <!-- Offline / PWA Settings placeholder -->
      <section class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-wifi-off" class="w-5 h-5 text-primary-500" />
          {{ $t('settings.offline') }}
        </h2>
        
        <div class="flex flex-col gap-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.offline_desc') }}</p>
          <div class="flex items-center justify-between">
               <ClientOnly>
                 <div id="pwa-install-container">
                    <UButton v-if="$pwa?.needRefresh" @click="$pwa.updateServiceWorker()" color="primary" variant="solid" icon="i-lucide-refresh-cw">
                      {{ $t('settings.update_app') }}
                    </UButton>
                    <UButton v-else-if="$pwa?.showInstallPrompt && !$pwa?.offlineReady && !$pwa?.needRefresh" @click="$pwa.install()" color="primary" variant="soft" icon="i-lucide-download">
                      {{ $t('settings.install_app') }}
                    </UButton>
                    <p v-else class="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                      <UIcon name="i-lucide-check-circle" class="w-5 h-5" />
                      {{ $t('settings.app_installed') }}
                    </p>
                 </div>
               </ClientOnly>
          </div>
        </div>
      </section>

      <!-- Help Section -->
      <section class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-help-circle" class="w-5 h-5 text-primary-500" />
          {{ $t('settings.help') }}
        </h2>
        
        <div class="flex flex-col gap-2">
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">{{ $t('settings.help_desc') }}</p>
          <UButton
            :to="localePath('/help')"
            color="primary"
            variant="soft"
            icon="i-lucide-info"
            class="justify-center w-full sm:w-auto sm:justify-start"
          >
            {{ $t('settings.view_help') }}
          </UButton>
        </div>
      </section>

      <!-- Links -->
      <section class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-external-link" class="w-5 h-5 text-primary-500" />
          {{ $t('settings.links') }}
        </h2>
        
        <div class="flex flex-col gap-2">
          <UButton
            to="https://juanman.tech/"
            target="_blank"
            color="neutral"
            variant="ghost"
            icon="i-lucide-user"
            class="justify-start"
          >
            {{ $t('settings.dev_web') }}
          </UButton>
          
          <UButton
            to="https://salamancadetransportes.com/"
            target="_blank"
            color="neutral"
            variant="ghost"
            icon="i-lucide-bus"
            class="justify-start"
          >
            {{ $t('settings.official_web') }}
          </UButton>
          
          <UButton
            to="https://www.amazon.es/Juan-Manuel-B%C3%A9c-Bus-Salamanca/dp/B0F59TDK93/?utm_source=bussalamanca.juanman.tech"
            target="_blank"
            color="neutral"
            variant="ghost"
            icon="i-lucide-mic"
            class="justify-start"
          >
            {{ $t('settings.alexa_skill_btn') }}
          </UButton>
          
          <UButton
            to="https://github.com/JuanmanDev/BusSalamancaAlexa"
            target="_blank"
            color="neutral"
            variant="ghost"
            icon="i-lucide-github"
            class="justify-start"
          >
            {{ $t('settings.source_code') }}
          </UButton>
        </div>
      </section>
    </div>

    <!-- Footer -->
    <footer class="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 text-center space-y-4">
      <div class="text-sm text-gray-500 dark:text-gray-400">
        <p class="font-medium text-gray-900 dark:text-white mb-1">BusSalamanca v{{ version }}</p>
        <p>{{ $t('settings.footer_created_by') }} <strong>Juanma</strong></p>
      </div>
      
      <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-xs text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-left">
        <p class="mb-2"><strong class="text-gray-700 dark:text-gray-300">{{ $t('settings.legal_notice') }}</strong> {{ $t('settings.legal_text_1') }}</p>
        <p>{{ $t('settings.legal_text_2') }}</p>
      </div>
    </footer>
  </div>
</template>
