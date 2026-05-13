import { watch } from 'vue'

export type AppTheme = 'light' | 'dark'

function applyThemeClass(mode: AppTheme) {
  if (!import.meta.client) return
  document.documentElement.classList.toggle('dark', mode === 'dark')
}

export default defineNuxtPlugin(() => {
  const theme = useState<AppTheme>('app-theme', () => 'dark')

  if (import.meta.client) {
    const stored = localStorage.getItem('robotics-theme')
    if (stored === 'light' || stored === 'dark') {
      theme.value = stored
    }
    applyThemeClass(theme.value)
  }

  watch(theme, (t) => {
    if (!import.meta.client) return
    applyThemeClass(t)
    localStorage.setItem('robotics-theme', t)
  })
})
