import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Shield, Bell, Palette, CreditCard, RotateCcw, CheckCircle, ExternalLink, Zap, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingButton, ProcessStatus } from '@/components/ui/LoadingStates'
import { useTheme } from '@/lib/theme'
import { useAuth, apiClient } from '@/api/client'
import { toast } from 'react-hot-toast'
import { displayError } from '@/utils/errorHandling'

type PaymentMethod = 'stripe' | 'manual' | null

interface NotificationSettings {
  email_notifications: boolean
  payment_reminders: boolean
}

export function SettingsView() {
  const { theme, setTheme } = useTheme()
  const queryClient = useQueryClient()
  const [stripeConnecting, setStripeConnecting] = useState(false)
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_notifications: true,
    payment_reminders: true
  })

  // Get user data with better cache management
  const { data: user, isLoading: userLoading, refetch: refetchUser } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const response = await apiClient.get('/auth/me')
      return response.data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: 'always'
  })

  // Get user settings
  const { data: userSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['user', 'settings'],
    queryFn: async () => {
      // For now, return default settings since backend doesn't have this endpoint yet
      return {
        email_notifications: true,
        payment_reminders: true,
        theme: user?.theme || 'system'
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10 // 10 minutes
  })

  // Update local notification state when settings are loaded
  useEffect(() => {
    if (userSettings) {
      setNotifications({
        email_notifications: userSettings.email_notifications,
        payment_reminders: userSettings.payment_reminders
      })
    }
  }, [userSettings])

  // Sync settings across tabs/windows
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refetch user data when tab becomes visible
        refetchUser()
        queryClient.invalidateQueries({ queryKey: ['user', 'settings'] })
      }
    }

    const handleFocus = () => {
      // Sync data when window gains focus
      refetchUser()
      queryClient.invalidateQueries({ queryKey: ['user', 'settings'] })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [refetchUser, queryClient])

  // Update payment method with optimistic updates
  const updatePaymentMethodMutation = useMutation({
    mutationFn: async (method: PaymentMethod) => {
      if (method === 'stripe') {
        const response = await apiClient.get('/integrations/stripe/connect')
        return response.data
      } else if (method === 'manual') {
        const response = await apiClient.patch('/auth/me', {
          payment_method: 'manual'
        })
        return response.data
      }
    },
    onMutate: async (method) => {
      // Optimistic update for manual payment method
      if (method === 'manual') {
        await queryClient.cancelQueries({ queryKey: ['user', 'profile'] })
        const previousUser = queryClient.getQueryData(['user', 'profile'])

        queryClient.setQueryData(['user', 'profile'], (old: any) => ({
          ...old,
          payment_method: 'manual'
        }))

        return { previousUser }
      }
    },
    onSuccess: (data, method) => {
      if (method === 'stripe') {
        // Handle Stripe connection response
        if (data.error || data.demo_mode) {
          displayError(new Error(data.message || data.error), {
            operation: 'stripe_connect',
            component: 'SettingsView'
          })
          setStripeConnecting(false)
          return
        }

        if (data.url) {
          toast.success('Redirecting to Stripe...')
          window.location.href = data.url
        } else {
          displayError(new Error('Unable to generate Stripe connection URL'), {
            operation: 'stripe_connect',
            component: 'SettingsView'
          })
          setStripeConnecting(false)
        }
      } else if (method === 'manual') {
        toast.success('Payment method updated to manual invoicing')
        // Force refetch to ensure consistency
        refetchUser()
      }
    },
    onError: (error: any, method, context) => {
      // Rollback optimistic update
      if (context?.previousUser) {
        queryClient.setQueryData(['user', 'profile'], context.previousUser)
      }

      displayError(error, {
        operation: 'update_payment_method',
        component: 'SettingsView'
      })
      setStripeConnecting(false)
    }
  })

  // Reset onboarding with better UX
  const resetOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.patch('/auth/me', {
        onboarding_status: 'not_started'
      })
      return response.data
    },
    onMutate: async () => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['user', 'profile'] })
      const previousUser = queryClient.getQueryData(['user', 'profile'])

      queryClient.setQueryData(['user', 'profile'], (old: any) => ({
        ...old,
        onboarding_status: 'not_started'
      }))

      return { previousUser }
    },
    onSuccess: () => {
      toast.success('Account setup reset! Redirecting to onboarding...')
      // Clear relevant caches
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
      queryClient.invalidateQueries({ queryKey: ['user', 'settings'] })

      setTimeout(() => {
        window.location.href = '/onboarding'
      }, 1500)
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic update
      if (context?.previousUser) {
        queryClient.setQueryData(['user', 'profile'], context.previousUser)
      }

      displayError(error, {
        operation: 'reset_onboarding',
        component: 'SettingsView'
      })
    }
  })

  // Add notification settings mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (settings: NotificationSettings) => {
      // For now, just simulate API call since backend doesn't have this endpoint
      await new Promise(resolve => setTimeout(resolve, 500))
      return settings
    },
    onMutate: async (newSettings) => {
      // Optimistic update
      setNotifications(newSettings)
      await queryClient.cancelQueries({ queryKey: ['user', 'settings'] })
      const previousSettings = queryClient.getQueryData(['user', 'settings'])

      queryClient.setQueryData(['user', 'settings'], (old: any) => ({
        ...old,
        ...newSettings
      }))

      return { previousSettings }
    },
    onSuccess: (data) => {
      toast.success('Notification preferences updated')
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic update
      if (context?.previousSettings) {
        queryClient.setQueryData(['user', 'settings'], context.previousSettings)
        setNotifications({
          email_notifications: context.previousSettings.email_notifications,
          payment_reminders: context.previousSettings.payment_reminders
        })
      }

      displayError(error, {
        operation: 'update_notifications',
        component: 'SettingsView'
      })
    }
  })

  const handleStripeConnect = () => {
    setStripeConnecting(true)
    updatePaymentMethodMutation.mutate('stripe')
  }

  const handleManualPayment = () => {
    updatePaymentMethodMutation.mutate('manual')
  }

  const handleResetOnboarding = () => {
    if (confirm('Are you sure you want to reset your account setup? This will take you back to the onboarding process and clear your current configuration.')) {
      resetOnboardingMutation.mutate()
    }
  }

  const handleNotificationChange = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = {
      ...notifications,
      [key]: value
    }
    updateNotificationsMutation.mutate(newSettings)
  }

  const isStripeConnected = user?.stripe_account_id && user?.payment_method === 'stripe'
  const isManualConfigured = user?.payment_method === 'manual'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Update your personal information and preferences.
            </p>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => alert('Profile editing functionality coming soon!')}
            >
              Edit Profile
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Manage your password and security settings.
            </p>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => alert('Password change functionality coming soon!')}
            >
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Choose your preferred theme.
            </p>
            <div className="space-y-2">
              {[
                { key: 'light', label: 'Light' },
                { key: 'dark', label: 'Dark' },
                { key: 'system', label: 'System' },
              ].map((option) => (
                <label key={option.key} className="flex items-center gap-2 py-2">
                  <input
                    type="radio"
                    name="theme"
                    value={option.key}
                    checked={theme === option.key}
                    onChange={(e) => setTheme(e.target.value as typeof theme)}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Configure how you collect payments from clients.
            </p>

            {userLoading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : (
              <div className="space-y-4">
                {/* Current Status */}
                {isStripeConnected && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>Stripe connected and active</span>
                  </div>
                )}
                {isManualConfigured && (
                  <div className="flex items-center gap-2 text-blue-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>Manual invoicing configured</span>
                  </div>
                )}
                {!isStripeConnected && !isManualConfigured && (
                  <div className="text-sm text-gray-500">
                    No payment method configured
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <LoadingButton
                    variant={isStripeConnected ? "secondary" : "primary"}
                    size="sm"
                    onClick={handleStripeConnect}
                    isLoading={stripeConnecting || updatePaymentMethodMutation.isPending}
                    loadingText="Connecting to Stripe..."
                    className="flex items-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    {isStripeConnected ? 'Reconnect Stripe' : 'Connect Stripe'}
                    <ExternalLink className="h-3 w-3" />
                  </LoadingButton>

                  <LoadingButton
                    variant={isManualConfigured ? "secondary" : "outline"}
                    size="sm"
                    onClick={handleManualPayment}
                    isLoading={updatePaymentMethodMutation.isPending}
                    loadingText="Configuring manual payment..."
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Use Manual Invoicing
                  </LoadingButton>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Configure your notification preferences.
            </p>

            {settingsLoading ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded text-primary-600 focus:ring-primary-500"
                    checked={notifications.email_notifications}
                    onChange={(e) => handleNotificationChange('email_notifications', e.target.checked)}
                    disabled={updateNotificationsMutation.isPending}
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    Email notifications
                  </span>
                  {updateNotificationsMutation.isPending && (
                    <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded text-primary-600 focus:ring-primary-500"
                    checked={notifications.payment_reminders}
                    onChange={(e) => handleNotificationChange('payment_reminders', e.target.checked)}
                    disabled={updateNotificationsMutation.isPending}
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    Payment reminders
                  </span>
                  {updateNotificationsMutation.isPending && (
                    <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </label>
              </div>
            )}

            {/* Notification Status Indicator */}
            {updateNotificationsMutation.isPending && (
              <div className="mt-3">
                <ProcessStatus
                  status="loading"
                  message="Updating notification preferences..."
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Onboarding Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Account Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Reset your account setup to reconfigure your preferences.
            </p>

            {userLoading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Status: </span>
                  <span className={`font-medium ${
                    user?.onboarding_status === 'completed'
                      ? 'text-green-600'
                      : 'text-orange-600'
                  }`}>
                    {user?.onboarding_status === 'completed' ? 'Setup Complete' : 'Setup Pending'}
                  </span>
                </div>

                <LoadingButton
                  variant="outline"
                  size="sm"
                  onClick={handleResetOnboarding}
                  isLoading={resetOnboardingMutation.isPending}
                  loadingText="Resetting account setup..."
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset Account Setup
                </LoadingButton>

                <div className="text-xs text-gray-500">
                  This will take you through the setup process again to reconfigure your payment method,
                  import data, and customize your preferences.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}