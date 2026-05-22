import { defineNuxtPlugin } from '#app';
import { useAnalytics } from '../composables/useAnalytics';

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return;

  const analytics = useAnalytics();
  let startTime = Date.now();
  let currentPage = window.location.pathname;

  const trackTimeSpent = () => {
    const duration = Date.now() - startTime;
    analytics.trackTime(currentPage, duration);
  };

  nuxtApp.hook('page:start', () => {
    // Before navigating away, track the time spent on the current page
    trackTimeSpent();
  });

  nuxtApp.hook('page:finish', () => {
    // Reset timer for the new page
    startTime = Date.now();
    currentPage = window.location.pathname;
  });

  // Also track when the user leaves the site or closes the tab
  window.addEventListener('beforeunload', () => {
    trackTimeSpent();
  });
});
