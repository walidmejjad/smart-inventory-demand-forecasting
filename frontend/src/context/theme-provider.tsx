import { useCallback, useEffect, useState, type PropsWithChildren } from 'react'
import { ThemeContext } from '@/context/theme-context'
import { getStoredTheme, isTheme, THEME_STORAGE_KEY, type Theme } from '@/lib/theme'

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setCurrentTheme] = useState<Theme>(getStoredTheme)

  const setTheme = useCallback((nextTheme: Theme) => {
    setCurrentTheme(nextTheme)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    } catch {
      // Keep the control usable when browser storage is unavailable.
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
      document.documentElement.classList.toggle('dark', resolved === 'dark')
      document.documentElement.style.colorScheme = resolved
    }
    const syncStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        setCurrentTheme(isTheme(event.newValue) ? event.newValue : 'system')
      }
    }

    applyTheme()
    media.addEventListener('change', applyTheme)
    window.addEventListener('storage', syncStorage)
    return () => {
      media.removeEventListener('change', applyTheme)
      window.removeEventListener('storage', syncStorage)
    }
  }, [theme])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
