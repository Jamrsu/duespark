import React from 'react'
import { motion } from 'framer-motion'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const themes = [
    { value: 'light' as const, icon: Sun, label: 'Light mode' },
    { value: 'dark' as const, icon: Moon, label: 'Dark mode' },
    { value: 'system' as const, icon: Monitor, label: 'System mode' },
  ]

  const currentThemeIndex = themes.findIndex(t => t.value === theme)
  const nextThemeIndex = (currentThemeIndex + 1) % themes.length
  const nextTheme = themes[nextThemeIndex]

  const handleToggle = () => {
    setTheme(nextTheme.value)
  }

  const currentTheme = themes[currentThemeIndex]
  const CurrentIcon = currentTheme.icon

  return (
    <motion.button
      onClick={handleToggle}
      className={cn(
        "flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200",
        resolvedTheme === 'dark'
          ? "text-gray-300 hover:text-white"
          : "text-gray-600 hover:text-gray-900"
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={currentTheme.label}
    >
      <CurrentIcon className="h-5 w-5" />
    </motion.button>
  )
}