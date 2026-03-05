import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

export interface TrackedNotification {
    id: string
    lineId: string
    stopId: string
    destination: string
    targetTime: number // The original expected arrival time timestamp to uniquely identify the bus
    vehicleRef?: string
    minutesRemaining?: number
    expectedArrival?: string
    isEstimate?: boolean
}

// Global state to keep it alive across components
const activeNotifications = ref<TrackedNotification[]>([])
let worker: Worker | null = null

// Initialize worker only once per client
function initWorker() {
    if (typeof window === 'undefined') return
    if (!worker) {
        worker = new Worker('/notificationWorker.js')

        worker.onmessage = (e) => {
            const { type, payload } = e.data

            if (type === 'NOTIFICATION_UPDATE') {
                updateNotificationContent(payload)
            } else if (type === 'NOTIFICATION_ARRIVED') {
                handleBusArrived(payload)
            }
        }
    }
}

function stopWorker() {
    if (worker) {
        worker.postMessage({ type: 'STOP_ALL' })
        worker.terminate()
        worker = null
    }
}

function formatNotificationText(payload: any, t: any): string {
    const mins = payload.minutesRemaining
    let timeText = ''
    if (payload.expected) {
        let expectedDate: Date;
        if (typeof payload.expected === 'string' || typeof payload.expected === 'number') {
            expectedDate = new Date(payload.expected)
        } else {
            expectedDate = new Date(payload.expectedArrival)
        }

        if (!isNaN(expectedDate.getTime())) {
            // Format time without seconds (e.g., 20:15)
            timeText = expectedDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        }
    }

    const baseText = mins === 0
        ? t('notifications.arriving_now')
        : t('notifications.minutes_remaining', { mins })

    const estimateSuffix = payload.isEstimate ? ` ${t('notifications.estimate_suffix')}` : ''

    return `${baseText}${estimateSuffix}${timeText ? ` (${timeText})` : ''}`
}

function updateNotificationContent(payload: any) {
    // Update state
    const index = activeNotifications.value.findIndex(n => n.id === payload.id)
    if (index !== -1) {
        const item = activeNotifications.value[index]
        if (item) {
            item.minutesRemaining = payload.minutesRemaining
            item.isEstimate = payload.isEstimate
            item.expectedArrival = payload.expected
            item.targetTime = payload.targetTime || item.targetTime
        }
    }

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bus-notification-update', { detail: payload }))
    }
}

function handleBusArrived(payload: any) {
    // Remove from state
    activeNotifications.value = activeNotifications.value.filter(n => n.id !== payload.id)

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bus-notification-arrived', { detail: payload }))
    }
}

export function useArrivalNotification() {
    const { t } = useI18n()
    const toast = useToast()

    onMounted(() => {
        initWorker()
        window.addEventListener('bus-notification-update', handleUpdateEvent as EventListener)
        window.addEventListener('bus-notification-arrived', handleArrivedEvent as EventListener)
    })

    onBeforeUnmount(() => {
        window.removeEventListener('bus-notification-update', handleUpdateEvent as EventListener)
        window.removeEventListener('bus-notification-arrived', handleArrivedEvent as EventListener)
    })

    function handleUpdateEvent(e: CustomEvent) {
        const payload = e.detail
        const isTracked = activeNotifications.value.some(n => n.id === payload.id)
        if (!isTracked) return

        if (Notification.permission === 'granted') {
            const bodyText = formatNotificationText(payload, t)
            new Notification(t('notifications.line_destination', { line: payload.lineId, destination: payload.destination }), {
                body: bodyText,
                tag: `bus-notification-${payload.id}`,
                icon: '/favicon.svg',
                silent: true
            })
        }
    }

    function handleArrivedEvent(e: CustomEvent) {
        const payload = e.detail
        if (Notification.permission === 'granted') {
            new Notification(t('notifications.bus_at_stop'), {
                body: t('notifications.bus_should_be_here', { line: payload.lineId }),
                tag: `bus-notification-${payload.id}`,
                icon: '/favicon.svg',
            })
        }
    }

    function isTracking(lineId: string, stopId: string, targetTime: number) {
        return activeNotifications.value.some(n => n.id === `${lineId}_${stopId}_${targetTime}`)
    }

    async function toggleTracking(lineId: string, stopId: string, destination: string, targetTime: number, expectedArrivalStr: string, vehicleRef?: string) {
        if (isTracking(lineId, stopId, targetTime)) {
            stopTracking(lineId, stopId, targetTime)
        } else {
            await startTracking(lineId, stopId, destination, targetTime, expectedArrivalStr, vehicleRef)
        }
    }

    async function startTracking(lineId: string, stopId: string, destination: string, targetTime: number, expectedArrivalStr: string, vehicleRef?: string) {
        if (typeof window === 'undefined') return

        if (!('Notification' in window)) {
            toast.add({
                title: t('notifications.unsupported_browser'),
                color: 'error'
            })
            return
        }

        let permission = Notification.permission
        if (permission !== 'granted') {
            permission = await Notification.requestPermission()
        }

        if (permission === 'granted') {
            const id = `${lineId}_${stopId}_${targetTime}`
            if (!activeNotifications.value.some(n => n.id === id)) {
                activeNotifications.value.push({ id, lineId, stopId, destination, targetTime, expectedArrival: expectedArrivalStr, vehicleRef })
            }

            initWorker()
            worker?.postMessage({
                type: 'ADD_TRACKING',
                payload: { id, lineId, stopId, destination, targetTime, vehicleRef }
            })

            new Notification(t('notifications.following_line', { line: lineId }), {
                body: t('notifications.will_notify'),
                tag: `bus-notification-${id}`,
                icon: '/favicon.svg',
            })

            toast.add({
                title: t('notifications.following_line', { line: lineId }),
                description: t('notifications.will_notify'),
                color: 'primary',
                icon: 'i-lucide-bell-ring'
            })

        } else {
            toast.add({
                title: t('notifications.permission_denied'),
                description: t('notifications.enable_notifications'),
                color: 'warning',
                icon: 'i-lucide-bell-off'
            })
        }
    }

    function stopTracking(lineId: string, stopId: string, targetTime?: number) {
        if (targetTime !== undefined) {
            const id = `${lineId}_${stopId}_${targetTime}`
            activeNotifications.value = activeNotifications.value.filter(n => n.id !== id)
            worker?.postMessage({
                type: 'REMOVE_TRACKING',
                payload: { id }
            })
        } else {
            // fallback if someone just passes lineId and stopId for some reason (e.g. from Notifications Center where targetTime might be accessed differently)
            const matches = activeNotifications.value.filter(n => n.lineId === lineId && n.stopId === stopId)
            matches.forEach(m => {
                activeNotifications.value = activeNotifications.value.filter(n => n.id !== m.id)
                worker?.postMessage({ type: 'REMOVE_TRACKING', payload: { id: m.id } })
            })
        }
    }

    function stopAllTracking() {
        activeNotifications.value = []
        stopWorker()
    }

    return {
        activeNotifications,
        isTracking,
        toggleTracking,
        startTracking,
        stopTracking,
        stopAllTracking
    }
}
