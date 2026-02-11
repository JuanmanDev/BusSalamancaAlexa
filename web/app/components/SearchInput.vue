<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  autofocus?: boolean
}>(), {
  placeholder: 'Buscar...',
  autofocus: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputRef = ref<HTMLInputElement>()

function handleClear() {
  emit('update:modelValue', '')
  inputRef.value?.focus()
}

onMounted(() => {
  if (props.autofocus && inputRef.value) {
    inputRef.value.focus()
  }
})
</script>

<template>
  <div class="relative">
    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
      <UIcon name="i-lucide-search" class="w-5 h-5 text-gray-400" />
    </div>
    
    <input
      ref="inputRef"
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      class="w-full pl-11 pr-10 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />

    <Transition name="fade">
      <button
        v-if="modelValue"
        class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        @click="handleClear"
      >
        <UIcon name="i-lucide-x" class="w-5 h-5" />
      </button>
    </Transition>
  </div>
</template>
