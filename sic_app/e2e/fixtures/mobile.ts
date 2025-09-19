/**
 * Shared fixtures to support Phase 2 mobile-first test scenarios.
 */

export interface MobileViewportPreset {
  name: string
  width: number
  height: number
}

export const mobileViewportPresets: Record<'iphoneSE' | 'iphone12' | 'pixel5', MobileViewportPreset> = {
  iphoneSE: { name: 'iPhone SE', width: 375, height: 667 },
  iphone12: { name: 'iPhone 12', width: 390, height: 844 },
  pixel5: { name: 'Pixel 5', width: 393, height: 851 }
}

export interface MobileNavigationItem {
  testId: string
  path: string
  label: string
}

export const mobileNavigationItems: MobileNavigationItem[] = [
  { testId: 'bottom-nav-dashboard', path: '/dashboard', label: 'Dashboard' },
  { testId: 'bottom-nav-invoices', path: '/invoices', label: 'Invoices' },
  { testId: 'bottom-nav-clients', path: '/clients', label: 'Clients' },
  { testId: 'bottom-nav-settings', path: '/settings', label: 'Settings' }
]

export const TOUCH_TARGET_MIN_HEIGHT = 44
export const TOUCH_TARGET_MIN_WIDTH = 44
