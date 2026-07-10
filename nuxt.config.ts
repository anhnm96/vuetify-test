import type { NuxtPage } from 'nuxt/schema'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-12-21',
  devtools: { enabled: false },
  // ssr: false,
   modules: [
    '@nuxt/fonts',
    'vuetify-nuxt-module',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/icon',
    'vue-sonner/nuxt',
    '@vee-validate/nuxt',
    '@crazydos/nuxt-msw'
  ],
  hooks: {
    'pages:extend': function (pages) {
      const pagesToRemove: NuxtPage[] = []
      pages.forEach((page) => {
        if (page.path.includes('component') || page.path.includes('constant') || page.path.includes('type')) pagesToRemove.push(page)
      })

      pagesToRemove.forEach((page: NuxtPage) => {
        pages.splice(pages.indexOf(page), 1)
      })
    },
  },
  components: [
    {
      path: '~/components',
      pathPrefix: false,
      ignore: ['**/context.ts'],
    },
    {
      path: '~/components/common',
      pathPrefix: false,
      ignore: ['**/context.ts'],
    },
    {
      path: '~/components',
    },
  ],
  imports: {
    dirs: ['composables/*/index.{ts,js,mjs,mts}'],
  },
   icon: {
    mode: 'css',
    cssLayer: 'base',
  },
  fonts: {
    defaults: {
      weights: [400, 500, 600, 700],
    },
  },

  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  },

  css: [
    'assets/styles/layers.css',
    'vuetify/styles',
    'assets/styles/tailwind.css',
  ],

  vuetify: {
    moduleOptions: {
      styles: { configFile: 'assets/styles/settings.scss' },
    },
    vuetifyOptions: {
      theme: {
        defaultTheme: 'dark', // default 'system' requires `ssr: false` to avoid hydration warnings
        utilities: false,
      },
      display: {
        mobileBreakpoint: 'md',
        thresholds: {
          xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920, xxl: 2560,
        },
      },
       locale: {
        locale: 'ja',
      },
      localeMessages: ['ja'],
    },
  },
  unhead: {
      legacy: true,
    renderSSRHeadOptions: {
      omitLineBreaks: false,
    }
  },
  devServer: {
    port: 5173,
  },
  msw: {
    enable: true,
  },
})
