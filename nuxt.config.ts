// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  app: {
    head: {
      title: 'РобоСклад — управління складом робототехніки',
      htmlAttrs: { lang: 'uk' },
      script: [
        {
          key: 'robotics-theme-init',
          innerHTML:
            "(function(){try{var t=localStorage.getItem('robotics-theme');document.documentElement.classList.toggle('dark',t!=='light');}catch(e){document.documentElement.classList.add('dark');}})();",
          type: 'text/javascript',
          tagPosition: 'head',
        },
      ],
    },
  },
  /** Секрети сервера: значення з `.env` підхоплює Nuxt за ім’ям `NUXT_GEMINI_API_KEY`. */
  runtimeConfig: {
    geminiApiKey: '',
    /** За замовчуванням gemini-2.5-flash. Fallback: gemini-2.5-flash-lite. Перевизначення: NUXT_GEMINI_MODEL. */
    geminiModel: 'gemini-2.5-flash',
    /** Мінімум 32 символи. Див. `.env.example`. */
    sessionSecret: '',
    sessionCookieName: 'robotics_session',
  },
  imports: {
    dirs: ['entities/user'],
  },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/image'],
  build: {
    transpile: ['echarts', 'vue-echarts'],
  },
  image: {
    quality: 78,
    domains: ['upload.wikimedia.org', 'commons.wikimedia.org', 'placehold.co'],
  },
  css: ['~/app/styles/tailwind.css'],
  typescript: {
    strict: true,
  },
  tailwindcss: {
    exposeConfig: false,
    viewer: false,
  },
})
