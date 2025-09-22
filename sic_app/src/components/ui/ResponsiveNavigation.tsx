/**
 * Responsive Navigation Component
 * Provides consistent navigation patterns across all pages with mobile-first design
 */

import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Home,
  FileText,
  Users,
  Settings,
  LogOut,
  Bell,
  Search
} from 'lucide-react'
import { Button } from './Button'
import { useAccessibility, useFocusTrap } from './AccessibilityProvider'

interface NavigationItem {
  id: string
  label: string
  href?: string
  icon?: React.ReactNode
  badge?: string | number
  children?: NavigationItem[]
  onClick?: () => void
  external?: boolean
}

interface ResponsiveNavigationProps {
  items: NavigationItem[]
  logo?: React.ReactNode
  userSection?: React.ReactNode
  className?: string
  onNavigate?: (item: NavigationItem) => void
}

export function ResponsiveNavigation({
  items,
  logo,
  userSection,
  className,
  onNavigate
}: ResponsiveNavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const location = useLocation()
  const { announceToScreenReader, isReducedMotion } = useAccessibility()
  const mobileMenuRef = useFocusTrap(isMobileMenuOpen)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false)
        mobileMenuButtonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isMobileMenuOpen])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
      announceToScreenReader('Navigation menu opened', 'assertive')
    } else {
      document.body.style.overflow = ''
      if (document.activeElement === document.body) {
        announceToScreenReader('Navigation menu closed', 'assertive')
      }
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen, announceToScreenReader])

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const toggleExpandItem = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const isActiveItem = (item: NavigationItem): boolean => {
    if (item.href) {
      return location.pathname === item.href || location.pathname.startsWith(item.href + '/')
    }
    if (item.children) {
      return item.children.some(child => isActiveItem(child))
    }
    return false
  }

  const handleItemClick = (item: NavigationItem) => {
    onNavigate?.(item)
    if (item.onClick) {
      item.onClick()
    }
    if (!item.children) {
      setIsMobileMenuOpen(false)
    }
  }

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const isActive = isActiveItem(item)
    const isExpanded = expandedItems.has(item.id)
    const hasChildren = item.children && item.children.length > 0

    const ItemContent = (
      <div
        className={cn(
          'flex items-center justify-between w-full px-4 py-3 text-left rounded-lg transition-all duration-200',
          'min-h-[44px] tap-target',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          level > 0 && 'ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-6',
          isActive
            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {item.icon && (
            <span
              className={cn(
                'flex-shrink-0',
                isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
              )}
              aria-hidden="true"
            >
              {item.icon}
            </span>
          )}
          <span className="truncate">{item.label}</span>
          {item.badge && (
            <span
              className="ml-auto bg-primary-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center"
              aria-label={`${item.badge} notifications`}
            >
              {item.badge}
            </span>
          )}
        </div>

        {hasChildren && (
          <span className="flex-shrink-0 ml-2" aria-hidden="true">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
        )}
      </div>
    )

    if (item.href) {
      return (
        <Link
          key={item.id}
          to={item.href}
          onClick={() => handleItemClick(item)}
          className="block"
          aria-current={isActive ? 'page' : undefined}
        >
          {ItemContent}
        </Link>
      )
    }

    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => {
              toggleExpandItem(item.id)
              handleItemClick(item)
            }}
            className="w-full"
            aria-expanded={isExpanded}
            aria-controls={`submenu-${item.id}`}
          >
            {ItemContent}
          </button>

          {isExpanded && (
            <div
              id={`submenu-${item.id}`}
              className={cn(
                'mt-1 space-y-1',
                !isReducedMotion && 'animate-in slide-in-from-top-1 duration-200'
              )}
              role="region"
              aria-label={`${item.label} submenu`}
            >
              {item.children?.map(child => renderNavigationItem(child, level + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <button
        key={item.id}
        onClick={() => handleItemClick(item)}
        className="w-full"
      >
        {ItemContent}
      </button>
    )
  }

  return (
    <>
      {/* Desktop/Tablet Navigation */}
      <nav
        className={cn(
          'hidden lg:flex items-center justify-between w-full px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700',
          className
        )}
        aria-label="Main navigation"
        id="main-navigation"
      >
        {/* Logo */}
        {logo && (
          <div className="flex-shrink-0">
            {logo}
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex items-center space-x-1">
          {items.map(item => {
            if (item.children) {
              // TODO: Implement dropdown for desktop
              return null
            }

            const isActive = isActiveItem(item)

            if (item.href) {
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                    'min-h-[44px] tap-target',
                    isActive
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.icon}
                  {item.label}
                  {item.badge && (
                    <span className="bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            }

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                  'min-h-[44px] tap-target',
                  'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                {item.icon}
                {item.label}
                {item.badge && (
                  <span className="bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* User Section */}
        {userSection && (
          <div className="flex-shrink-0">
            {userSection}
          </div>
        )}
      </nav>

      {/* Mobile Navigation Header */}
      <header className="lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          {logo && (
            <div className="flex-shrink-0">
              {logo}
            </div>
          )}

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="md"
            onClick={toggleMobileMenu}
            ariaLabel={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden"
            leftIcon={isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          >
            {isMobileMenuOpen ? 'Close' : 'Menu'}
          </Button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className={cn(
            'fixed inset-0 z-50 lg:hidden',
            !isReducedMotion && 'animate-in fade-in duration-200'
          )}
          aria-hidden="true"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Mobile Menu */}
      <nav
        ref={mobileMenuRef}
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-white dark:bg-gray-900 shadow-xl lg:hidden',
          'transform transition-transform duration-300',
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full',
          !isReducedMotion && isMobileMenuOpen && 'animate-in slide-in-from-right duration-300'
        )}
        aria-label="Mobile navigation"
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Navigation</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(false)}
              ariaLabel="Close navigation menu"
              leftIcon={<X className="h-4 w-4" />}
            >
              Close
            </Button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {items.map(item => renderNavigationItem(item))}
          </div>

          {/* User Section */}
          {userSection && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              {userSection}
            </div>
          )}
        </div>
      </nav>
    </>
  )
}

// Default navigation items for DueSpark
export const defaultNavigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/app/dashboard',
    icon: <Home className="h-4 w-4" />
  },
  {
    id: 'invoices',
    label: 'Invoices',
    href: '/app/invoices',
    icon: <FileText className="h-4 w-4" />
  },
  {
    id: 'clients',
    label: 'Clients',
    href: '/app/clients',
    icon: <Users className="h-4 w-4" />
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/app/settings',
    icon: <Settings className="h-4 w-4" />
  }
]