<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
    origin?: string
    destination?: string
    originName?: string
    destinationName?: string
}>()

function getIcon(val?: string, isDest = false) {
    if (!val) return isDest ? 'i-lucide-map-pin' : 'i-lucide-circle'
    if (val === 'user') return 'i-lucide-navigation'
    if (val.startsWith('loc:')) return 'i-lucide-map-pin'
    if (val.match(/^\d+$/)) return 'i-lucide-bus' // Stop ID usually digits
    if (val.includes('osm')) return 'i-lucide-map-pin'
    return isDest ? 'i-lucide-map-pin' : 'i-lucide-circle'
}

const originIcon = computed(() => getIcon(props.origin))
const destIcon = computed(() => getIcon(props.destination, true))

// Mock nodes for the graph animation
const nodes = [1, 2, 3]
</script>

<template>
    <div class="flex flex-col items-center justify-center py-6 w-full max-w-sm mx-auto overflow-hidden">
        
        <!-- Graph Animation Container -->
        <div class="flex items-center justify-between w-full h-16 relative">
            
            <!-- Connection Lines Layer -->
            <div class="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200 dark:bg-gray-700 z-0 overflow-hidden">
                <!-- Animated Pulse -->
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-primary-500 to-transparent w-1/2 h-full opacity-50 animate-shimmer" style="transform: translateX(-100%)"></div>
            </div>

            <!-- Origin Node -->
            <div class="relative z-10 flex flex-col items-center gap-1">
                 <div class="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-gray-900 animate-pulse-slow">
                     <UIcon :name="originIcon" class="w-5 h-5" />
                 </div>
                 <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Origen</span>
            </div>

            <!-- Intermediate Graph Nodes (Animated) -->
            <div class="flex-1 flex justify-center items-center gap-4 relative z-10 mx-2">
                <div 
                    v-for="(n, i) in nodes" 
                    :key="n"
                    class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce-custom"
                    :style="{ animationDelay: `${i * 0.2}s` }"
                ></div>
                
                <!-- Floating Mode Icon -->
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-4 animate-float opacity-0 animate-fade-in-out">
                     <div class="bg-white dark:bg-gray-800 rounded-full p-1.5 shadow-md border border-gray-100 dark:border-gray-700 text-primary-500">
                         <UIcon name="i-lucide-bus" class="w-4 h-4" />
                     </div>
                </div>
            </div>

            <!-- Destination Node -->
            <div class="relative z-10 flex flex-col items-center gap-1">
                 <div class="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-gray-900 animate-pulse-slow" :style="{ animationDelay: '0.5s' }">
                     <UIcon :name="destIcon" class="w-5 h-5" />
                 </div>
                 <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Destino</span>
            </div>

        </div>
        
        <!-- Text Status -->
        <p class="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">
            Calculando la mejor ruta...
        </p>
    </div>
</template>

<style scoped>
@keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(200%); }
}

.animate-shimmer {
    animation: shimmer 1.5s infinite linear;
}

@keyframes bounce-custom {
    0%, 100% { transform: scale(0.8); opacity: 0.5; }
    50% { transform: scale(1.3); opacity: 1; }
}

.animate-bounce-custom {
    animation: bounce-custom 1s infinite ease-in-out;
}

@keyframes float {
    0%, 100% { transform: translate(-50%, -50%); }
    50% { transform: translate(-50%, -60%); }
}

.animate-float {
    animation: float 2s infinite ease-in-out;
}

@keyframes fade-in-out {
    0%, 100% { opacity: 0; }
    50% { opacity: 1; }
}

.animate-fade-in-out {
    animation: fade-in-out 3s infinite ease-in-out;
}

.animate-pulse-slow {
    animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: .9; transform: scale(1.05); }
}
</style>
