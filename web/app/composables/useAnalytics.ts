declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: Record<string, any>) => void;
    };
  }
}

export const useAnalytics = () => {
  const track = (eventName: string, eventData?: Record<string, any>) => {
    try {
      if (import.meta.client && window.umami && typeof window.umami.track === 'function') {
        window.umami.track(eventName, eventData);
      }
    } catch (e) {
      console.warn('Analytics tracking failed', e);
    }
  };

  const trackClick = (elementId: string, additionalData?: Record<string, any>) => {
    track('click', { element: elementId, ...additionalData });
  };

  const trackView = (elementId: string, additionalData?: Record<string, any>) => {
    track('view', { element: elementId, ...additionalData });
  };

  const trackTime = (page: string, durationMs: number) => {
    // Only track if time spent is greater than a minimum threshold (e.g., 2 seconds) to avoid noise
    if (durationMs > 2000) {
      track('time_spent', { page, durationSeconds: Math.round(durationMs / 1000) });
    }
  };

  return {
    track,
    trackClick,
    trackView,
    trackTime,
  };
};
