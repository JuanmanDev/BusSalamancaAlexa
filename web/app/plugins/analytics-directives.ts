import { defineNuxtPlugin } from '#app';
import { useAnalytics } from '../composables/useAnalytics';

export default defineNuxtPlugin((nuxtApp) => {
  const analytics = useAnalytics();

  // Directive to track clicks
  nuxtApp.vueApp.directive('track-click', {
    mounted(el, binding) {
      el._trackClickHandler = () => {
        const value = binding.value;
        if (typeof value === 'string') {
          analytics.trackClick(value);
        } else if (typeof value === 'object' && value !== null) {
          analytics.trackClick(value.id || 'unknown_element', value.data);
        }
      };
      el.addEventListener('click', el._trackClickHandler);
    },
    unmounted(el) {
      if (el._trackClickHandler) {
        el.removeEventListener('click', el._trackClickHandler);
      }
    }
  });

  // Directive to track when an element becomes visible (data views)
  nuxtApp.vueApp.directive('track-view', {
    mounted(el, binding) {
      if (!import.meta.client || !window.IntersectionObserver) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const value = binding.value;
            if (typeof value === 'string') {
              analytics.trackView(value);
            } else if (typeof value === 'object' && value !== null) {
              analytics.trackView(value.id || 'unknown_view', value.data);
            }
            // Disconnect after tracking the view once
            observer.disconnect();
          }
        });
      }, { threshold: 0.5 }); // Trigger when at least 50% visible

      observer.observe(el);
      el._trackViewObserver = observer;
    },
    unmounted(el) {
      if (el._trackViewObserver) {
        el._trackViewObserver.disconnect();
      }
    }
  });
});
