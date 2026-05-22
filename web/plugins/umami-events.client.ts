export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) return

  const router = useRouter()

  nuxtApp.hook('app:mounted', () => {
    // ----------------------------------------------------
    // 1. Enhanced Click Tracking
    // ----------------------------------------------------
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      const clickable = target.closest('a, button, [role="button"], img, summary, details, [data-track="true"]') as HTMLElement
      
      if (clickable) {
        const type = clickable.tagName.toLowerCase()
        const id = clickable.id || ''
        let text = ''
        let href = ''
        let src = ''
        let alt = ''

        if (type === 'img') {
          const img = clickable as HTMLImageElement
          src = img.src || ''
          alt = img.alt || ''
          text = alt
        } else if (type === 'a') {
          href = clickable.getAttribute('href') || ''
          text = clickable.textContent?.replace(/\s+/g, ' ').trim().slice(0, 50) || ''
        } else if (type === 'summary' || type === 'details') {
          text = clickable.textContent?.replace(/\s+/g, ' ').trim().slice(0, 50) || ''
        } else {
          text = clickable.textContent?.replace(/\s+/g, ' ').trim().slice(0, 50) || ''
        }
        
        const payload: Record<string, string> = { type, id }
        if (text) payload.text = text
        if (href) payload.href = href
        if (src) payload.src = src
        if (alt) payload.alt = alt

        umTrackEvent('click_interaction', payload)
      }
    })

    // ----------------------------------------------------
    // 2. View Duration Tracking (Intersection Observer)
    // ----------------------------------------------------
    const viewTimers = new Map<Element, number>()
    
    const observer = new IntersectionObserver((entries) => {
      const now = Date.now()
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Element entered viewport
          viewTimers.set(entry.target, now)
        } else {
          // Element left viewport
          const startTime = viewTimers.get(entry.target)
          if (startTime) {
            const elapsedSeconds = (now - startTime) / 1000
            if (elapsedSeconds >= 2) {
              const el = entry.target as HTMLElement
              const type = el.tagName.toLowerCase()
              const id = el.id || 'no-id'
              let identifier = id
              
              if (type === 'img') {
                identifier = (el as HTMLImageElement).src || id
              } else if (el.hasAttribute('data-track-view')) {
                identifier = el.getAttribute('data-track-view') || id
              }

              umTrackEvent('view_duration', { 
                element_type: type, 
                identifier: identifier, 
                seconds: Math.round(elapsedSeconds) 
              })
            }
            viewTimers.delete(entry.target)
          }
        }
      })
    }, { threshold: 0.5 }) // Require at least 50% visibility

    // Function to observe elements dynamically
    const observeElements = () => {
      document.querySelectorAll('img, section, article, [data-track-view]').forEach(el => {
        if (!viewTimers.has(el)) {
          observer.observe(el)
        }
      })
    }

    // Observe initially and set up mutation observer for dynamically added elements
    observeElements()
    const mutationObserver = new MutationObserver((mutations) => {
      let shouldObserve = false
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldObserve = true
          break
        }
      }
      if (shouldObserve) {
        // debounce to avoid performance issues
        setTimeout(observeElements, 100)
      }
    })
    mutationObserver.observe(document.body, { childList: true, subtree: true })


    // ----------------------------------------------------
    // 3. Scroll Depth and Global Session Time
    // ----------------------------------------------------
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

    const globalStartTime = Date.now()
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        if (maxScroll > 10) {
          const bucket = Math.floor(maxScroll / 25) * 25
          umTrackEvent('scroll_depth', { max_depth_percent: `${bucket}` })
        }
        const timeSpent = Math.round((Date.now() - globalStartTime) / 1000)
        umTrackEvent('time_spent', { seconds: timeSpent })
      }
    })
  })

  // ----------------------------------------------------
  // 4. URL Elapsed Time Tracking
  // ----------------------------------------------------
  let routeStartTime = Date.now()
  let currentRoute = router.currentRoute.value.fullPath

  router.afterEach((to, from) => {
    const now = Date.now()
    const elapsedSeconds = (now - routeStartTime) / 1000
    
    // Only track if we spent more than 1 second on the page to avoid spam
    if (elapsedSeconds > 1) {
      umTrackEvent('page_duration', { 
        url: currentRoute, 
        seconds: Math.round(elapsedSeconds) 
      })
    }
    
    routeStartTime = now
    currentRoute = to.fullPath
  })
})
