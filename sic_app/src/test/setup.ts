import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Clean up after each test
afterEach(() => {
  cleanup()
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock localStorage
const localStorageMock: Storage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  get length() {
    return 0
  },
  key: vi.fn().mockReturnValue(null),
}
global.localStorage = localStorageMock

// Mock sessionStorage
global.sessionStorage = localStorageMock

// Mock PerformanceObserver
const PerformanceObserverMock = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
}))

// Add static property for supportedEntryTypes
Object.defineProperty(PerformanceObserverMock, 'supportedEntryTypes', {
  value: ['navigation', 'measure', 'paint', 'layout-shift', 'largest-contentful-paint', 'first-input'],
  writable: false,
  enumerable: true,
  configurable: false,
})

global.PerformanceObserver = PerformanceObserverMock as any

// Mock navigator
Object.defineProperty(window, 'navigator', {
  writable: true,
  value: {
    ...window.navigator,
    userAgent: 'test-agent',
  },
})

// Set test environment flag for monitoring service
;(global as any).__vitest__ = true

// Mock react-hot-toast globally
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn()
  },
  Toaster: vi.fn(() => null)
}))

// Mock import.meta.env for tests
Object.defineProperty(import.meta, 'env', {
  value: {
    ...import.meta.env,
    MODE: 'test',
    VITEST: true,
  },
})

// Mock lucide-react icons globally with common icons
vi.mock('lucide-react', () => ({
  // Common icons used in tests
  CheckCircle: vi.fn(() => null),
  Circle: vi.fn(() => null),
  ArrowRight: vi.fn(() => null),
  ArrowLeft: vi.fn(() => null),
  User: vi.fn(() => null),
  Mail: vi.fn(() => null),
  RefreshCw: vi.fn(() => null),
  AlertCircle: vi.fn(() => null),
  CreditCard: vi.fn(() => null),
  FileText: vi.fn(() => null),
  ExternalLink: vi.fn(() => null),
  Zap: vi.fn(() => null),
  FileSpreadsheet: vi.fn(() => null),
  Upload: vi.fn(() => null),
  Users: vi.fn(() => null),
  Phone: vi.fn(() => null),
  Globe: vi.fn(() => null),
  Loader2: vi.fn(() => null),
  Clock: vi.fn(() => null),
  XCircle: vi.fn(() => null),
  CircleCheckBig: vi.fn(() => null),
  // Add any other icons that might be needed
  Settings: vi.fn(() => null),
  DollarSign: vi.fn(() => null),
  Calendar: vi.fn(() => null),
  Eye: vi.fn(() => null),
  Edit: vi.fn(() => null),
  Trash: vi.fn(() => null),
  Plus: vi.fn(() => null),
  Minus: vi.fn(() => null),
  Search: vi.fn(() => null),
  Filter: vi.fn(() => null),
  Download: vi.fn(() => null),
  Share: vi.fn(() => null),
  Copy: vi.fn(() => null),
  Check: vi.fn(() => null),
  X: vi.fn(() => null)
}))