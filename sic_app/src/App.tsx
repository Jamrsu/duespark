import React, { Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from './api/client'
import { apiClient } from './api/client'
import { AxiosError } from 'axios'
import { User } from './types/api'

// Layout components
import { AppLayout } from './components/layout/AppLayout'
import { AuthLayout } from './components/layout/AuthLayout'

// Loading component
import { LoadingSpinner } from './components/ui/LoadingSpinner'

// Error boundary
import { ErrorBoundary } from './components/ErrorBoundary'

// Lazy-loaded views
const LoginView = React.lazy(() => import('./views/auth/LoginView').then(module => ({ default: module.LoginView })))
const RegisterView = React.lazy(() => import('./views/auth/RegisterView').then(module => ({ default: module.RegisterView })))
const DashboardView = React.lazy(() => import('./views/dashboard/DashboardView').then(module => ({ default: module.DashboardView })))
const InvoicesView = React.lazy(() => import('./views/invoices/InvoicesView').then(module => ({ default: module.InvoicesView })))
const InvoiceDetailView = React.lazy(() => import('./views/invoices/InvoiceDetailView').then(module => ({ default: module.InvoiceDetailView })))
const InvoiceCreateView = React.lazy(() => import('./views/invoices/InvoiceCreateView').then(module => ({ default: module.InvoiceCreateView })))
const InvoiceEditView = React.lazy(() => import('./views/invoices/InvoiceEditView').then(module => ({ default: module.InvoiceEditView })))
const ClientsView = React.lazy(() => import('./views/clients/ClientsView').then(module => ({ default: module.ClientsView })))
const ClientDetailView = React.lazy(() => import('./views/clients/ClientDetailView').then(module => ({ default: module.ClientDetailView })))
const ClientCreateView = React.lazy(() => import('./views/clients/ClientCreateView').then(module => ({ default: module.ClientCreateView })))
const ClientEditView = React.lazy(() => import('./views/clients/ClientEditView').then(module => ({ default: module.ClientEditView })))
const SubscriptionView = React.lazy(() => import('./views/subscription/SubscriptionView').then(module => ({ default: module.SubscriptionView })))
const SettingsView = React.lazy(() => import('./views/settings/SettingsView').then(module => ({ default: module.SettingsView })))
const OnboardingView = React.lazy(() => import('./views/onboarding/OnboardingView').then(module => ({ default: module.OnboardingView })))
const ReferralsView = React.lazy(() => import('./views/referrals/ReferralsView').then(module => ({ default: module.ReferralsView })))
const FAQView = React.lazy(() => import('./views/help/FAQView'))
const EnterpriseView = React.lazy(() => import('./views/enterprise/EnterpriseView').then(module => ({ default: module.EnterpriseView })))
const LandingView = React.lazy(() => import('./views/landing/LandingView').then(module => ({ default: module.LandingView })))

// Route guards
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated()) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

function RequireGuest({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated()) {
    return <Navigate to="/app/dashboard" replace />
  }

  return <>{children}</>
}

// Onboarding guard - redirects to onboarding if not completed
function RequireOnboardingComplete({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, clearAllAuthData } = useAuth()
  const location = useLocation()

  const { data: user, isLoading, error, refetch } = useQuery<User>({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const response = await apiClient.get<User>('/auth/me')
      return response.data
    },
    enabled: isAuthenticated(),
    retry: (failureCount, error) => {
      // Don't retry on 401 errors
      if (error instanceof AxiosError && error.response?.status === 401) return false
      return failureCount < 2
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  })

  // Check authentication first
  if (!isAuthenticated()) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  // Handle authentication errors
  if (error) {
    // If we get a 401, clear all auth data and redirect
    if (error instanceof AxiosError && error.response?.status === 401) {
      clearAllAuthData()
      return <Navigate to="/auth/login" state={{ from: location }} replace />
    }

    // For other errors, show a retry option
    if (!isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-red-600 dark:text-red-400">
              Unable to load user data. Please try again.
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Retry
            </button>
          </div>
        </div>
      )
    }
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  // Skip onboarding check for the onboarding route itself
  if (location.pathname === '/onboarding') {
    return <>{children}</>
  }

  // Redirect to onboarding if not completed
  if (user && user.onboarding_status !== 'completed') {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary level="critical">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Routes>
          {/* Landing page - public route */}
          <Route
            path="/"
            element={
              <ErrorBoundary level="page">
                <Suspense fallback={<LoadingSpinner />}>
                  <ErrorBoundary level="component">
                    <LandingView />
                  </ErrorBoundary>
                </Suspense>
              </ErrorBoundary>
            }
          />

          {/* Auth routes */}
          <Route
            path="/auth/*"
            element={
              <ErrorBoundary level="page">
                <RequireGuest>
                  <AuthLayout>
                    <Suspense fallback={<LoadingSpinner />}>
                      <Routes>
                        <Route
                          path="login"
                          element={
                            <ErrorBoundary level="component">
                              <LoginView />
                            </ErrorBoundary>
                          }
                        />
                        <Route
                          path="register"
                          element={
                            <ErrorBoundary level="component">
                              <RegisterView />
                            </ErrorBoundary>
                          }
                        />
                        <Route path="*" element={<Navigate to="/auth/login" replace />} />
                      </Routes>
                    </Suspense>
                  </AuthLayout>
                </RequireGuest>
              </ErrorBoundary>
            }
          />

          {/* Onboarding route */}
          <Route
            path="/onboarding"
            element={
              <ErrorBoundary level="page">
                <RequireAuth>
                  <Suspense fallback={<LoadingSpinner />}>
                    <ErrorBoundary level="component">
                      <OnboardingView />
                    </ErrorBoundary>
                  </Suspense>
                </RequireAuth>
              </ErrorBoundary>
            }
          />

          {/* App routes */}
          <Route
            path="/app/*"
            element={
              <ErrorBoundary level="page">
                <RequireOnboardingComplete>
                  <AppLayout>
                    <Suspense fallback={<LoadingSpinner />}>
                      <Routes>
                        <Route
                          path="dashboard"
                          element={
                            <ErrorBoundary level="component">
                              <DashboardView />
                            </ErrorBoundary>
                          }
                        />

                        <Route
                          path="invoices"
                          element={
                            <ErrorBoundary level="component">
                              <InvoicesView />
                            </ErrorBoundary>
                          }
                        />
                        <Route
                          path="invoices/new"
                          element={
                            <ErrorBoundary level="component">
                              <InvoiceCreateView />
                            </ErrorBoundary>
                          }
                        />
                        <Route
                          path="invoices/:id"
                          element={
                            <ErrorBoundary level="component">
                              <InvoiceDetailView />
                            </ErrorBoundary>
                          }
                        />
                        <Route
                          path="invoices/:id/edit"
                          element={
                            <ErrorBoundary level="component">
                              <InvoiceEditView />
                            </ErrorBoundary>
                          }
                        />

                        <Route
                          path="clients"
                          element={
                            <ErrorBoundary level="component">
                              <ClientsView />
                            </ErrorBoundary>
                          }
                        />
                        <Route
                          path="clients/new"
                          element={
                            <ErrorBoundary level="component">
                              <ClientCreateView />
                            </ErrorBoundary>
                          }
                        />
                        <Route
                          path="clients/:id"
                          element={
                            <ErrorBoundary level="component">
                              <ClientDetailView />
                            </ErrorBoundary>
                          }
                        />
                        <Route
                          path="clients/:id/edit"
                          element={
                            <ErrorBoundary level="component">
                              <ClientEditView />
                            </ErrorBoundary>
                          }
                        />

                        <Route
                          path="subscription"
                          element={
                            <ErrorBoundary level="component">
                              <SubscriptionView />
                            </ErrorBoundary>
                          }
                        />

                        <Route
                          path="referrals"
                          element={
                            <ErrorBoundary level="component">
                              <ReferralsView />
                            </ErrorBoundary>
                          }
                        />

                        <Route
                          path="settings"
                          element={
                            <ErrorBoundary level="component">
                              <SettingsView />
                            </ErrorBoundary>
                          }
                        />

                        <Route
                          path="help/faq"
                          element={
                            <ErrorBoundary level="component">
                              <FAQView />
                            </ErrorBoundary>
                          }
                        />

                        <Route
                          path="enterprise/*"
                          element={
                            <ErrorBoundary level="component">
                              <EnterpriseView />
                            </ErrorBoundary>
                          }
                        />

                        <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
                        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
                      </Routes>
                    </Suspense>
                  </AppLayout>
                </RequireOnboardingComplete>
              </ErrorBoundary>
            }
          />

          {/* Redirect /dashboard to /app/dashboard for compatibility */}
          <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />

          {/* Catch-all route for authenticated users */}
          <Route path="*" element={<Navigate to="/auth/login" replace />} />
        </Routes>
      </div>
    </ErrorBoundary>
  )
}