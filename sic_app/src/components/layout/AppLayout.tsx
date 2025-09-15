import React, { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  FileText,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Crown,
  Gift,
  HelpCircle
} from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { useAuth } from '@/api/client'
import { Button } from '../ui/Button'
import { cn } from '@/lib/utils'
import { useNavigationSwipes, isTouchDevice } from '@/hooks/useSwipeGestures'

interface AppLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Subscription', href: '/subscription', icon: Crown },
  { name: 'Referrals', href: '/referrals', icon: Gift },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help & FAQ', href: '/help/faq', icon: HelpCircle },
]

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Navigation swipe gestures (only on touch devices)
  const swipeRef = useNavigationSwipes({
    onNavigateBack: () => {
      // Go to previous page in navigation order
      const currentIndex = navigation.findIndex(nav => nav.href === location.pathname)
      if (currentIndex > 0) {
        navigate(navigation[currentIndex - 1].href)
      }
    },
    onNavigateForward: () => {
      // Go to next page in navigation order
      const currentIndex = navigation.findIndex(nav => nav.href === location.pathname)
      if (currentIndex < navigation.length - 1 && currentIndex !== -1) {
        navigate(navigation[currentIndex + 1].href)
      }
    },
    onOpenMenu: () => setSidebarOpen(true),
    onCloseMenu: () => setSidebarOpen(false),
    disabled: !isTouchDevice()
  })

  const toggleTheme = () => {
    const themes = ['light', 'dark', 'system'] as const
    const currentIndex = themes.indexOf(theme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    setTheme(nextTheme)
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun className="h-4 w-4" />
      case 'dark': return <Moon className="h-4 w-4" />
      default: return <Monitor className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar */}
      <div className={cn(
        'fixed inset-0 z-50 lg:hidden',
        sidebarOpen ? 'block' : 'hidden'
      )}>
        <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 shadow-xl">
          <div className="p-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  DueSpark
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="p-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <nav className="space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname.startsWith(item.href)
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 focus-ring',
                      isActive
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </NavLink>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              DueSpark
            </span>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href)
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 focus-ring',
                    isActive
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </Button>
              
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/help/faq')}
                className="p-2"
                aria-label="Help & FAQ"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="p-2"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} theme`}
              >
                {getThemeIcon()}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6 pb-20 lg:pb-6" ref={swipeRef}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
          {/* Touch hint for swipe gestures (mobile only) */}
          {isTouchDevice() && (
            <div className="lg:hidden fixed bottom-20 left-4 right-4 text-center">
              <div className="bg-gray-800/80 dark:bg-gray-200/80 text-white dark:text-gray-800 text-xs px-3 py-2 rounded-full backdrop-blur-sm opacity-0 animate-fade-in pointer-events-none">
                💡 Swipe left/right to navigate • Swipe down to open menu
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom nav (alternative to top nav) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-bottom" data-testid="bottom-navigation">
        <div className="grid grid-cols-4 gap-1 px-2 py-2">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href)
            return (
              <NavLink
                key={item.name}
                to={item.href}
                data-testid={`bottom-nav-${item.name.toLowerCase()}`}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors duration-200 tap-target',
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs font-medium truncate">
                  {item.name}
                </span>
              </NavLink>
            )
          })}
        </div>
      </div>
    </div>
  )
}