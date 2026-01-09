import tailwindcss from "@tailwindcss/vite";
import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: [
    '@pinia/nuxt',
    '@vueuse/nuxt'
  ],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:4201',
    }
  },
  components: [
    '~/components',
    {
      path: '~/features',
      pathPrefix: false,
      extensions: ['vue']
    }
  ],
  pages: true,
  vite: {
    plugins: [
      tailwindcss(),
    ],
    server: {
      allowedHosts: ['dev.7trip.co'],
    }
  }
})
