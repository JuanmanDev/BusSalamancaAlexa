<script setup lang="ts">
definePageMeta({
  layout: 'simple'
})

const router = useRouter()
const { t } = useI18n()
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
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">{{ $t('help.title') }}</h1>
        <p class="text-gray-500 dark:text-gray-400">{{ $t('help.subtitle') }}</p>
      </div>
    </div>

    <div class="space-y-6">
      <!-- Estimations -->
      <section class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-clock" class="w-6 h-6 text-primary-500" />
          {{ $t('help.estimations.title') }}
        </h2>
        <div class="space-y-4 text-gray-600 dark:text-gray-300" v-html="$t('help.estimations.p1')"></div>
        <div class="space-y-4 text-gray-600 dark:text-gray-300 mt-4" v-html="$t('help.estimations.p2')"></div>
      </section>

      <!-- Locations -->
      <section class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-map-pin" class="w-6 h-6 text-primary-500" />
          {{ $t('help.locations.title') }}
        </h2>
        <div class="space-y-4 text-gray-600 dark:text-gray-300" v-html="$t('help.locations.p1')"></div>
        <div class="space-y-4 text-gray-600 dark:text-gray-300 mt-4" v-html="$t('help.locations.p2')"></div>
      </section>

      <!-- Data Source -->
      <section class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-database" class="w-6 h-6 text-primary-500" />
          {{ $t('help.data.title') }}
        </h2>
        <div class="space-y-4 text-gray-600 dark:text-gray-300" v-html="$t('help.data.p1')"></div>
        <div class="space-y-4 text-gray-600 dark:text-gray-300 mt-4" v-html="$t('help.data.p2')"></div>
      </section>

      <!-- Refreshing Data -->
      <section class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-refresh-cw" class="w-6 h-6 text-primary-500" />
          {{ $t('help.refresh.title') }}
        </h2>
        <div class="space-y-4 text-gray-600 dark:text-gray-300" v-html="$t('help.refresh.p1')"></div>
      </section>
    </div>
  </div>
</template>
