<template>
  <v-app>
    <v-main>
      <nuxt-page />
    </v-main>
     <AppDialog class="app-dialog text-default" />

    <Toaster
      expand
      position="bottom-right"
      :theme="appStore.isDarkMode ? 'dark' : 'light'"
    />
  </v-app>
</template>

<script lang="ts" setup>
  import { Toaster } from 'vue-sonner'

  const appStore = useAppStore()
</script>
