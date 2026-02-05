/**
 * Composable for managing favorites and recent items
 * Uses localStorage for persistence with auto-load on client
 */

import type { FavoriteItem, RecentItem } from '~/types/bus'

const FAVORITES_KEY = 'bus-salamanca-favorites'
const RECENTS_KEY = 'bus-salamanca-recents'
const MAX_RECENTS = 10

// Track if storage has been loaded (singleton pattern)
const storageLoaded = ref(false)

export function useStorage() {
    const favorites = useState<FavoriteItem[]>('favorites', () => [])
    const recents = useState<RecentItem[]>('recents', () => [])

    // Load from localStorage on client - auto-called once
    function loadFromStorage() {
        if (import.meta.server) return
        if (storageLoaded.value) return // Only load once

        try {
            const storedFavorites = localStorage.getItem(FAVORITES_KEY)
            if (storedFavorites) {
                favorites.value = JSON.parse(storedFavorites)
            }

            const storedRecents = localStorage.getItem(RECENTS_KEY)
            if (storedRecents) {
                recents.value = JSON.parse(storedRecents)
            }

            storageLoaded.value = true
        } catch (e) {
            console.error('Error loading from storage:', e)
        }
    }

    function saveToStorage() {
        if (import.meta.server) return

        try {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites.value))
            localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.value))
        } catch (e) {
            console.error('Error saving to storage:', e)
        }
    }

    // Auto-load on client mount
    if (import.meta.client) {
        loadFromStorage()
    }

    // --- Favorites ---

    function isFavorite(type: 'stop' | 'line', id: string): boolean {
        return favorites.value.some(f => f.type === type && f.id === id)
    }

    function addFavorite(type: 'stop' | 'line', id: string, name: string) {
        if (isFavorite(type, id)) return

        favorites.value.push({
            type,
            id,
            name,
            addedAt: Date.now(),
        })
        saveToStorage()
    }

    function removeFavorite(type: 'stop' | 'line', id: string) {
        favorites.value = favorites.value.filter(f => !(f.type === type && f.id === id))
        saveToStorage()
    }

    function toggleFavorite(type: 'stop' | 'line', id: string, name: string) {
        if (isFavorite(type, id)) {
            removeFavorite(type, id)
        } else {
            addFavorite(type, id, name)
        }
    }

    // --- Recents ---

    function addRecent(type: 'stop' | 'line', id: string, name: string) {
        // Remove if already exists
        recents.value = recents.value.filter(r => !(r.type === type && r.id === id))

        // Add to beginning
        recents.value.unshift({
            type,
            id,
            name,
            visitedAt: Date.now(),
        })

        // Limit size
        if (recents.value.length > MAX_RECENTS) {
            recents.value = recents.value.slice(0, MAX_RECENTS)
        }

        saveToStorage()
    }

    function clearRecents() {
        recents.value = []
        saveToStorage()
    }

    // Getters for filtered lists
    const favoriteStops = computed(() =>
        favorites.value.filter(f => f.type === 'stop')
    )

    const favoriteLines = computed(() =>
        favorites.value.filter(f => f.type === 'line')
    )

    const recentStops = computed(() =>
        recents.value.filter(r => r.type === 'stop')
    )

    const recentLines = computed(() =>
        recents.value.filter(r => r.type === 'line')
    )

    return {
        favorites,
        recents,
        loadFromStorage,
        isFavorite,
        addFavorite,
        removeFavorite,
        toggleFavorite,
        addRecent,
        clearRecents,
        favoriteStops,
        favoriteLines,
        recentStops,
        recentLines,
    }
}
