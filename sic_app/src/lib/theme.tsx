import React, { createContext, useContext, useEffect, useState } from 'react'
import { storage } from './utils'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => 
    storage.get('theme', 'system') as Theme
  )

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const updateResolvedTheme = () => {
      let newResolvedTheme: 'light' | 'dark'

      if (theme === 'system') {
        newResolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
      } else {
        newResolvedTheme = theme
      }

      setResolvedTheme(newResolvedTheme)
      
      // Update DOM
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(newResolvedTheme)

      // Update meta theme-color for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]')
      if (metaThemeColor) {
        metaThemeColor.setAttribute(
          'content',
          newResolvedTheme === 'dark' ? '#030712' : '#ffffff'
        )
      } else {
        const meta = document.createElement('meta')
        meta.name = 'theme-color'
        meta.content = newResolvedTheme === 'dark' ? '#030712' : '#ffffff'
        document.head.appendChild(meta)
      }
    }

    updateResolvedTheme()

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', updateResolvedTheme)

    return () => mediaQuery.removeEventListener('change', updateResolvedTheme)
  }, [theme])

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    storage.set('theme', newTheme)
  }

  return (
    <ThemeContext.Provider 
      value={{
        theme,
        setTheme: handleSetTheme,
        resolvedTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}