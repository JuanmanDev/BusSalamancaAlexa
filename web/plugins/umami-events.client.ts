export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) return

  nuxtApp.hook('app:mounted', () => {
    // 1. Track global clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      const clickable = target.closest('a, button, [role="button"]') as HTMLElement
      if (clickable) {
        const text = clickable.textContent?.replace(/\s+/g, ' ').trim().slice(0, 50) || ''
        const id = clickable.id || ''
        const type = clickable.tagName.toLowerCase()
        const href = clickable.getAttribute('href') || ''
        
        // Track the click event
        umTrackEvent('click_interaction', { type, text, id, href })
      }
    })

    // 2. Track scroll depth
    let maxScroll = 0
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null

    const handleScroll = () => {
      if (scrollTimeout) return
      scrollTimeout = setTimeout(() => {
        const scrollPercent = Math.round((window.scrollY + window.innerHeight) / document.body.scrollHeight * 100)
        if (scrollPercent > maxScroll) {
          maxScroll = scrollPercent
        }
        scrollTimeout = null
      }, 500)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    // Report scroll depth and session time when leaving
    const startTime = Date.now()
    
    // Use visibilitychange as it's more reliable than beforeunload on mobile
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Track scroll depth
        if (maxScroll > 10) {
          const bucket = Math.floor(maxScroll / 25) * 25 // 25, 50, 75, 100
          umTrackEvent('scroll_depth', { max_depth_percent: `${bucket}` })
        }

        // Track session time
        const timeSpent = Math.round((Date.now() - startTime) / 1000)
        umTrackEvent('time_spent', { seconds: timeSpent })
      }
    })
  })
})
