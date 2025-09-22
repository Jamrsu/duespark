import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'

import App from './App'
import { ThemeProvider } from './lib/theme'
import { KeyboardShortcutsProvider } from './context/KeyboardShortcutsContext'
import { ScreenReaderProvider } from './components/ui/ScreenReaderAnnouncer'
import { AccessibilityProvider } from './components/ui/AccessibilityProvider'
import { registerSW } from './lib/serviceWorker'
import './lib/contrastAuditor' // Auto-starts in development
import './index.css'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})

// Make query client globally accessible for auth clearing
declare global {
  interface Window {
    queryClient: QueryClient
  }
}

window.queryClient = queryClient

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ScreenReaderProvider>
            <AccessibilityProvider>
              <KeyboardShortcutsProvider>
                <App />
              <Toaster
                position="top-center"
                toastOptions={{
                  duration: 4000,
                  className: 'font-medium',
                  style: {
                    background: 'var(--toast-bg)',
                    color: 'var(--toast-color)',
                  },
                }}
              />
              <ReactQueryDevtools initialIsOpen={false} />
              </KeyboardShortcutsProvider>
            </AccessibilityProvider>
          </ScreenReaderProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
)

// Register service worker
registerSW({
  onUpdate: (_registration) => {
    console.log('App update available')
    // You could show a toast or modal here
  },
  onOffline: () => {
    console.log('App is now offline')
  },
  onOnline: () => {
    console.log('App is back online')
  }
})