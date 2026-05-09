// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  /** Секрети сервера: значення з `.env` підхоплює Nuxt за ім’ям `NUXT_GEMINI_API_KEY`. */
  runtimeConfig: {
    geminiApiKey: '',
    /** `gemini-1.5-flash` вимкнено Google; перевизначте через NUXT_GEMINI_MODEL за потреби. */
    geminiModel: 'gemini-2.5-flash',
  },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/app/styles/tailwind.css'],
  typescript: {
    strict: true,
  },
  tailwindcss: {
    exposeConfig: false,
    viewer: false,
  },
})
