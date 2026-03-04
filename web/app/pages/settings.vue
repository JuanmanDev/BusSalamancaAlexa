<script setup lang="ts">
import { useMapStore } from '~/stores/map'

definePageMeta({
  layout: 'simple'
})

const colorMode = useColorMode()
const mapStore = useMapStore()
const config = useRuntimeConfig()

const version = config.public.version || '0.0.0'

const themeOptions = [
  { label: 'Sistema', value: 'system', icon: 'i-lucide-monitor' },
  { label: 'Claro', value: 'light', icon: 'i-lucide-sun' },
  { label: 'Oscuro', value: 'dark', icon: 'i-lucide-moon' }
]

// To avoid hydration mismatch on themes
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

const handleThemeChange = (val: any) => {
  if (typeof val === 'string') colorMode.preference = val
}

</script>

<template>
  <div class="max-w-2xl mx-auto p-4 md:p-8 space-y-8 pb-32">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Ajustes</h1>
      <p class="text-gray-500 dark:text-gray-400">Personaliza tu experiencia en BusSalamanca</p>
    </div>

    <div class="space-y-6">
      <!-- Theme Settings -->
      <section class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-palette" class="w-5 h-5 text-primary-500" />
          Apariencia
        </h2>
        
        <div v-if="mounted" class="space-y-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">Selecciona el tema de la aplicación</p>
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
          Mapa
        </h2>
        
        <div class="flex items-center justify-between">
          <div>
            <span class="block font-medium text-gray-900 dark:text-white">Animaciones fluidas</span>
            <span class="text-sm text-gray-500 dark:text-gray-400">Activa o desactiva los movimientos dinámicos de cámara en el mapa.</span>
          </div>
          <USwitch v-model="mapStore.forceAnimations" />
        </div>
      </section>

      <!-- Offline / PWA Settings placeholder -->
      <section class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-wifi-off" class="w-5 h-5 text-primary-500" />
          Modo Sin Conexión
        </h2>
        
        <div class="flex flex-col gap-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">Instala la aplicación en tu dispositivo para poder consultar las paradas y líneas sin conexión a internet.</p>
          <div class="flex items-center justify-between">
               <ClientOnly>
                 <div id="pwa-install-container">
                    <UButton v-if="$pwa?.needRefresh" @click="$pwa.updateServiceWorker()" color="primary" variant="solid" icon="i-lucide-refresh-cw">
                      Actualizar Aplicación
                    </UButton>
                    <UButton v-else-if="$pwa?.showInstallPrompt && !$pwa?.offlineReady && !$pwa?.needRefresh" @click="$pwa.install()" color="primary" variant="soft" icon="i-lucide-download">
                      Instalar Aplicación
                    </UButton>
                    <p v-else class="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                      <UIcon name="i-lucide-check-circle" class="w-5 h-5" />
                      Instalación lista o app ya instalada
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
          Ayuda e Información
        </h2>
        
        <div class="flex flex-col gap-2">
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Consulta cómo funciona la aplicación, el origen de los datos y preguntas frecuentes sobre las estimaciones.</p>
          <UButton
            to="/help"
            color="primary"
            variant="soft"
            icon="i-lucide-info"
            class="justify-center w-full sm:w-auto sm:justify-start"
          >
            Ver página de Ayuda
          </UButton>
        </div>
      </section>

      <!-- Links -->
      <section class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-external-link" class="w-5 h-5 text-primary-500" />
          Enlaces de interés
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
            Web del desarrollador (Juanma)
          </UButton>
          
          <UButton
            to="https://salamancadetransportes.com/"
            target="_blank"
            color="neutral"
            variant="ghost"
            icon="i-lucide-bus"
            class="justify-start"
          >
            Web oficial de autobuses
          </UButton>
          
          <UButton
            to="https://www.amazon.es/Juan-Manuel-B%C3%A9c-Bus-Salamanca/dp/B0F59TDK93/?utm_source=bussalamanca.juanman.tech"
            target="_blank"
            color="neutral"
            variant="ghost"
            icon="i-lucide-mic"
            class="justify-start"
          >
            Skill de Alexa
          </UButton>
          
          <UButton
            to="https://github.com/JuanmanDev/BusSalamancaAlexa"
            target="_blank"
            color="neutral"
            variant="ghost"
            icon="i-lucide-github"
            class="justify-start"
          >
            Código fuente (GitHub)
          </UButton>
        </div>
      </section>
    </div>

    <!-- Footer -->
    <footer class="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 text-center space-y-4">
      <div class="text-sm text-gray-500 dark:text-gray-400">
        <p class="font-medium text-gray-900 dark:text-white mb-1">BusSalamanca v{{ version }}</p>
        <p>Creado por <strong>Juanma</strong></p>
      </div>
      
      <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-xs text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-left">
        <p class="mb-2"><strong class="text-gray-700 dark:text-gray-300">Aviso Legal:</strong> Este proyecto es de código abierto y no está afiliado, respaldado ni relacionado legalmente de ninguna forma con la empresa concesionaria del transporte público de Salamanca, el Ayuntamiento de Salamanca, ni ninguna otra entidad oficial.</p>
        <p>Los datos mostrados se obtienen a través de APIs públicas y pueden contener inexactitudes. Uso exclusivo con fines informativos.</p>
      </div>
    </footer>
  </div>
</template>
