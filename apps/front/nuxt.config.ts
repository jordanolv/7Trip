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
      apiBase: process.env.API_BASE_URL || 'http://localhost:8001',
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
  vite: {
    plugins: [
      tailwindcss(),
    ],
    server: {
      host: true,
      allowedHosts: ['dev.7trip.co'],
    }
  }
})
