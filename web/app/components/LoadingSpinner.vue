<script setup lang="ts">
const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg'
  text?: string
}>(), {
  size: 'md',
})

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}
</script>

<template>
  <div class="flex items-center justify-center gap-2">
    <UIcon 
      name="i-lucide-loader-2" 
      :class="sizeClasses[size]"
      class="animate-spin text-primary-500"
    />
    <span v-if="text" class="text-sm text-gray-500 dark:text-gray-400">
      {{ text }}
    </span>
  </div>
</template>
