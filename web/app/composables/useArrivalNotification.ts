import { ref, onBeforeUnmount } from 'vue'
import { useMapStore } from '~/stores/map'

export function useArrivalNotification() {
    const trackedLineId = ref<string | null>(null)
    let interval: ReturnType<typeof setInterval> | null = null

    const mapStore = useMapStore()

    function toggleTracking(lineId: string) {
        if (trackedLineId.value === lineId) {
            stopTracking()
        } else {
            startTracking(lineId)
        }
    }

    async function startTracking(lineId: string) {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            alert('Tu navegador no soporta notificaciones nativas.')
            return
        }

        let permission = Notification.permission
        if (permission !== 'granted') {
            permission = await Notification.requestPermission()
        }

        if (permission === 'granted') {
            trackedLineId.value = lineId

            // Initial notification (with sound/vibration)
            const arrival = mapStore.arrivals.find(a => a.lineId === lineId)
            if (arrival) {
                new Notification(`Siguiendo línea ${lineId}`, {
                    body: `Te avisaremos sobre su llegada a la parada.`,
                    tag: 'bus-notification',
                    icon: '/favicon.svg',
                })
            }

            updateNotification()
            if (interval) clearInterval(interval)
            interval = setInterval(updateNotification, 5000)
        } else {
            const toast = useToast()
            toast.add({
                title: 'Permiso denegado',
                description: 'Debes habilitar las notificaciones en tu navegador.',
                color: 'warning',
                icon: 'i-lucide-bell-off'
            })
        }
    }

    function stopTracking() {
        trackedLineId.value = null
        if (interval) {
            clearInterval(interval)
            interval = null
        }
    }

    function getLocalMinutesRemaining(expectedTime: Date): number {
        const diffMs = expectedTime.getTime() - Date.now()
        return Math.max(0, Math.floor(diffMs / 60000))
    }

    function updateNotification() {
        if (!trackedLineId.value) return

        const arrival = mapStore.arrivals.find(a => a.lineId === trackedLineId.value)

        if (!arrival) {
            // The bus disappeared from the arrivals list -> It passed!
            new Notification('¡Autobús en tu parada!', {
                body: `El autobús de la línea ${trackedLineId.value} ya debería estar aquí.`,
                tag: 'bus-notification',
                icon: '/favicon.svg',
            })
            stopTracking()
            return
        }

        const mins = getLocalMinutesRemaining(arrival.expectedArrivalTime)
        const baseText = mins === 0 ? '¡Llegando ahora!' : `Faltan ${mins} min para tu parada`
        const textInfo = arrival.isEstimate ? `${baseText} (Estimación)` : baseText

        new Notification(`Línea ${arrival.lineId} - ${arrival.destination}`, {
            body: textInfo,
            tag: 'bus-notification',
            icon: '/favicon.svg',
            silent: true // Prevents device vibrating/beeping every 5 seconds!
        })
    }

    onBeforeUnmount(() => {
        stopTracking()
    })

    return {
        trackedLineId,
        toggleTracking,
        stopTracking
    }
}
