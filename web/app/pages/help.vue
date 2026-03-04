<script setup lang="ts">
definePageMeta({
  layout: 'simple'
})

const router = useRouter()
</script>

<template>
  <div class="max-w-3xl mx-auto p-4 md:p-8 space-y-8 pb-32">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <UButton
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        @click="router.back()"
        class="-ml-2"
        aria-label="Volver"
      />
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Ayuda y Preguntas Frecuentes</h1>
        <p class="text-gray-500 dark:text-gray-400">Información sobre el funcionamiento de BusSalamanca</p>
      </div>
    </div>

    <div class="space-y-6">
      <!-- Estimations -->
      <section class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-clock" class="w-6 h-6 text-primary-500" />
          Tiempos de Estimación
        </h2>
        <div class="space-y-4 text-gray-600 dark:text-gray-300">
          <p>
            Los tiempos de llegada que se muestran en la aplicación son <strong>estimaciones y aproximaciones</strong> calculadas según los datos anteriores y la posición actual de los autobuses.
          </p>
          <p>
            Al tratarse de estimaciones en tiempo real que dependen del tráfico, incidencias en la vía o paradas prolongadas, <strong>pueden contener errores</strong> o variar repentinamente. No representan una garantía exacta del momento de llegada del autobús.
          </p>
        </div>
      </section>

      <!-- Locations -->
      <section class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-map-pin" class="w-6 h-6 text-primary-500" />
          Ubicación de los Autobuses
        </h2>
        <div class="space-y-4 text-gray-600 dark:text-gray-300">
          <p>
            La ubicación de los autobuses en el mapa también puede tener un margen de error. En ocasiones, el GPS de los vehículos pierde señal o <strong>no se actualiza con la frecuencia deseada</strong>.
          </p>
          <p>
            Esto puede provocar que veas que un autobús "salta" de forma brusca en el mapa, o que parezca estar detenido cuando en realidad sigue en movimiento.
          </p>
        </div>
      </section>

      <!-- Data Source -->
      <section class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-database" class="w-6 h-6 text-primary-500" />
          Origen de los Datos
        </h2>
        <div class="space-y-4 text-gray-600 dark:text-gray-300">
          <p>
            Todos los datos utilizados en BusSalamanca provienen directamente de la información pública y oficial ofrecida por <strong>Salamanca de Transportes</strong>.
          </p>
          <p>
            Al no ser nosotros los generadores de esta información original, <strong>no podemos ofrecer garantías</strong> sobre su disponibilidad, exactitud o veracidad en todo momento. Nuestra aplicación actúa únicamente como un visor mejorado y accesible de dichos datos.
          </p>
        </div>
      </section>

      <!-- Refreshing Data -->
      <section class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-refresh-cw" class="w-6 h-6 text-primary-500" />
          Actualización de la Pantalla
        </h2>
        <div class="space-y-4 text-gray-600 dark:text-gray-300">
          <p>
            La aplicación intenta mantener los datos lo más frescos posibles sin necesidad de que recargues la página. Sin embargo, si notas que la información lleva varios minutos sin cambiar o se ha perdido la conexión de red momentáneamente, te recomendamos actualizar la pantalla manualmente tirando hacia abajo (en móviles) o utilizando el botón de refrescar de tu navegador.
          </p>
        </div>
      </section>
    </div>
  </div>
</template>
