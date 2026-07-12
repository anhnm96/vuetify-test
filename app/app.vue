<script lang="ts" setup>
import { PiniaColadaDevtools } from '@pinia/colada-devtools'
import { Toaster } from 'vue-sonner'

const darkMode = ref(true)
const theme = useTheme()
watch(darkMode, (val) => {
  document.documentElement.classList.toggle('dark', val)
  theme.change(val ? 'dark' : 'light')
}, { immediate: true })
</script>

<template>
  <v-app>
    <v-main>
      <nuxt-page />
      <Checkbox
        v-model="darkMode" label="Dark mode"
        :label-props="{ class: 'absolute right-4 top-4' }"
      />
    </v-main>
    <AppDialog class="app-dialog text-default" />

    <Toaster
      expand
      position="bottom-right"
      :theme="darkMode ? 'dark' : 'light'"
    />
    <PiniaColadaDevtools />
  </v-app>
</template>
