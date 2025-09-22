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
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { useAuth } from '@/api/client'
import { Button } from '../ui/Button'
import { cn } from '@/lib/utils'
import { useNavigationSwipes, isTouchDevice } from '@/hooks/useSwipeGestures'
import { withErrorBoundary } from '@/components/ErrorBoundary'
import { AmbientBackground } from './AmbientBackground'

interface AppLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: Home },
  { name: 'Invoices', href: '/app/invoices', icon: FileText },
  { name: 'Clients', href: '/app/clients', icon: Users },
  { name: 'Subscription', href: '/app/subscription', icon: Crown },
  { name: 'Referrals', href: '/app/referrals', icon: Gift },
  { name: 'Settings', href: '/app/settings', icon: Settings },
  { name: 'Help & FAQ', href: '/app/help/faq', icon: HelpCircle },
]

function AppLayoutBase({ children }: AppLayoutProps): JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [bottomNavCollapsed, setBottomNavCollapsed] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Navigation swipe gestures (only on touch devices)
  const swipeRef = useNavigationSwipes({
    onNavigateBack: () => {
      // Go to previous page in navigation order
      const currentIndex = navigation.findIndex(nav => location.pathname.startsWith(nav.href))
      if (currentIndex > 0) {
        navigate(navigation[currentIndex - 1].href)
      }
    },
    onNavigateForward: () => {
      // Go to next page in navigation order
      const currentIndex = navigation.findIndex(nav => location.pathname.startsWith(nav.href))
      if (currentIndex !== -1 && currentIndex < navigation.length - 1) {
        navigate(navigation[currentIndex + 1].href)
      }
    },
    onOpenMenu: () => setSidebarOpen(true),
    onCloseMenu: () => setSidebarOpen(false),
    disabled: !isTouchDevice()
  }) as React.MutableRefObject<HTMLDivElement | null>

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
    <div
      ref={swipeRef}
      className={cn(
        'relative min-h-screen overflow-hidden transition-colors duration-300',
        resolvedTheme === 'dark' ? 'bg-gray-950' : 'bg-slate-100'
      )}
    >
      <AmbientBackground theme={resolvedTheme} />
      <div className="relative z-10 min-h-screen">
        {/* Mobile sidebar */}
        <div className={cn(
          'fixed inset-0 z-50 lg:hidden',
          sidebarOpen ? 'block' : 'hidden'
        )}>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed top-0 left-0 h-full w-64 glass-panel shadow-2xl border-none">
          <div className="p-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 text-gray-900 dark:text-white" />
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
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64 glass-panel shadow-2xl border-none">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <Zap className="h-8 w-8 text-gray-900 dark:text-white" />
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
      <div className="lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="px-4 sm:px-6 lg:px-10 pt-6 pb-4">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 lg:px-6 lg:py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-white/20 dark:hover:bg-white/10"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/app/help/faq')}
                className="p-2 hover:bg-white/20 dark:hover:bg-white/10"
                aria-label="Help & FAQ"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="p-2 hover:bg-white/20 dark:hover:bg-white/10"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} theme`}
              >
                {getThemeIcon()}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="p-2 text-gray-600 hover:bg-white/20 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-10 pb-24 lg:pb-12">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
          {/* Touch hint for swipe gestures (mobile only) */}
          {isTouchDevice() && (
            <div className="lg:hidden fixed bottom-20 left-4 right-4 text-center">
              <div className="inline-flex items-center justify-center rounded-full bg-gray-900/70 dark:bg-white/70 text-white dark:text-gray-900 text-xs px-4 py-2 backdrop-blur-md shadow-lg opacity-0 animate-fade-in pointer-events-none">
                💡 Swipe left/right to navigate • Swipe down to open menu
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom nav (collapsible) */}
      <div className={cn(
        "lg:hidden fixed left-0 right-0 bg-white/80 dark:bg-gray-900/70 border-t border-white/20 dark:border-white/10 backdrop-blur-xl shadow-2xl safe-area-bottom transition-all duration-300",
        bottomNavCollapsed ? "bottom-0" : "bottom-0"
      )} data-testid="bottom-navigation">
        {/* Collapse/Expand Toggle */}
        <div className="flex justify-center">
          <button
            onClick={() => setBottomNavCollapsed(!bottomNavCollapsed)}
            className={cn(
              "p-2 rounded-t-lg transition-all duration-200",
              "bg-white/60 dark:bg-gray-800/60 hover:bg-white/80 dark:hover:bg-gray-800/80",
              "border border-b-0 border-white/20 dark:border-white/10"
            )}
          >
            {bottomNavCollapsed ? (
              <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <div className={cn(
          "overflow-hidden transition-all duration-300",
          bottomNavCollapsed ? "max-h-0" : "max-h-20"
        )}>
          <div className="grid grid-cols-4 gap-1 px-2 py-2">
            {navigation.slice(0, 4).map((item) => {
              const isActive = location.pathname.startsWith(item.href)
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  data-testid={`bottom-nav-${item.name.toLowerCase()}`}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all duration-200 tap-target',
                    isActive
                      ? 'text-primary-600 dark:text-primary-300 bg-white/40 dark:bg-white/10'
                      : 'text-gray-700 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-white/10'
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
    </div>
  </div>
  )
}

function AppLayoutFallback(): JSX.Element {
  const { resolvedTheme } = useTheme()

  return (
    <div
      className={cn(
        'relative min-h-screen overflow-hidden transition-colors duration-300',
        resolvedTheme === 'dark' ? 'bg-gray-950' : 'bg-slate-100'
      )}
    >
      <AmbientBackground theme={resolvedTheme} variant="subtle" />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        <div className="glass-panel max-w-lg w-full p-6 sm:p-8 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-red-500">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Something went wrong loading the dashboard shell
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Try reloading the page. If the issue persists, visit the help center or contact support so we can help restore your workspace.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => window.location.reload()} className="px-4 py-2">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload dashboard
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.location.assign('/help/faq')}
              className="px-4 py-2 bg-white/30 dark:bg-white/10 hover:bg-white/50 dark:hover:bg-white/20"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Visit help center
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const AppLayout = withErrorBoundary(AppLayoutBase, {
  level: 'page',
  fallback: <AppLayoutFallback />
})
