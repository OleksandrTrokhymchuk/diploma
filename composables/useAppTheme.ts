export type AppTheme = 'light' | 'dark'

export function useAppTheme() {
  const theme = useState<AppTheme>('app-theme', () => 'dark')

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function setTheme(mode: AppTheme) {
    theme.value = mode
  }

  return { theme, toggleTheme, setTheme }
}
