import { inject } from '@vercel/analytics';

export default defineNuxtPlugin(() => {
  if (import.meta.env.PROD && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    inject();
  }
});
