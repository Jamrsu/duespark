import React, { createContext, useContext, useEffect, useState } from 'react'
import { storage } from './utils'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  effectiveTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => 
    storage.get('theme', 'system') as Theme
  )

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const updateEffectiveTheme = () => {
      let newEffectiveTheme: 'light' | 'dark'
      
      if (theme === 'system') {
        newEffectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
          ? 'dark' 
          : 'light'
      } else {
        newEffectiveTheme = theme
      }
      
      setEffectiveTheme(newEffectiveTheme)
      
      // Update DOM
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(newEffectiveTheme)
      
      // Update meta theme-color for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]')
      if (metaThemeColor) {
        metaThemeColor.setAttribute(
          'content', 
          newEffectiveTheme === 'dark' ? '#111827' : '#ffffff'
        )
      } else {
        const meta = document.createElement('meta')
        meta.name = 'theme-color'
        meta.content = newEffectiveTheme === 'dark' ? '#111827' : '#ffffff'
        document.head.appendChild(meta)
      }
    }

    updateEffectiveTheme()

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', updateEffectiveTheme)

    return () => mediaQuery.removeEventListener('change', updateEffectiveTheme)
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
        effectiveTheme 
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