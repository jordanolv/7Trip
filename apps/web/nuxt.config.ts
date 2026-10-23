// Guest web (docs/architecture.md, "Web invité"): join a trip without the app, see its summary.
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  typescript: { strict: true },
  css: ['~/assets/main.css'],
  runtimeConfig: {
    /** NUXT_API_URL. Server side only: the browser never talks to the API directly. */
    apiUrl: 'http://localhost:3100/v1',
    /** NUXT_APPLE_APP_ID ("TEAMID.bundle.id") and NUXT_ANDROID_PACKAGE / NUXT_ANDROID_SHA256: universal links. */
    appleAppId: '',
    androidPackage: '',
    androidSha256: '',
    public: {
      /** NUXT_PUBLIC_APP_LINK: base of links that open the app (custom scheme until universal links ship). */
      appLink: 'seventrip://',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: '7Trip',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#F7F3EC' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,800&display=swap',
        },
      ],
    },
  },
});
