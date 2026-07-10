export const useAppStore = defineStore('app', () => {
  const isAppLoading = ref(true)

  function setLoading(val: boolean) {
    isAppLoading.value = val
  }

  const isPageLoading = ref(false)
  function setPageLoading(val: boolean) {
    isPageLoading.value = val
  }

  const isDarkMode = ref(false)
  function setDarkMode(val: boolean) {
    isDarkMode.value = val
  }

  return { isAppLoading, setLoading, isPageLoading, setPageLoading, isDarkMode, setDarkMode }
})
