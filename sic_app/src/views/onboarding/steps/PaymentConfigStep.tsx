import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, FileText, CheckCircle, ExternalLink, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { LoadingButton, ProcessStatus } from '@/components/ui/LoadingStates'
import { apiClient } from '@/api/client'
import { toast } from 'react-hot-toast'
import { displayError } from '@/utils/errorHandling'

interface PaymentConfigStepProps {
  user: any
  onNext: () => void
  onBack: () => void
  isLoading: boolean
}

type PaymentMethod = 'stripe' | 'manual'

export function PaymentConfigStep({ user, onNext, isLoading }: PaymentConfigStepProps) {
  const queryClient = useQueryClient()
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [stripeConnecting, setStripeConnecting] = useState(false)
  const [processStatus, setProcessStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState<string>('')

  // Configure payment method
  const configurePaymentMutation = useMutation({
    mutationFn: async (method: PaymentMethod) => {
      if (method === 'stripe') {
        // Get Stripe OAuth URL
        const response = await apiClient.get('/integrations/stripe/connect')
        return response.data
      } else {
        // Configure manual payment
        const response = await apiClient.put('/auth/me', {
          payment_method: 'manual'
        })
        return response.data
      }
    },
    onMutate: (method) => {
      setProcessStatus('loading')
      if (method === 'stripe') {
        setStatusMessage('Connecting to Stripe...')
        setStripeConnecting(true)
      } else {
        setStatusMessage('Configuring manual payment...')
      }
    },
    onSuccess: (data, method) => {
      if (method === 'stripe') {
        // Handle Stripe connection response
        if (data.error || data.demo_mode) {
          setProcessStatus('error')
          setStatusMessage(data.message || 'Stripe connection not available')
          setStripeConnecting(false)
          displayError(new Error(data.error || data.message), {
            operation: 'stripe_connect',
            component: 'PaymentConfigStep'
          })
          return
        }

        if (data.url) {
          setProcessStatus('success')
          setStatusMessage('Redirecting to Stripe...')

          // Track successful initiation
          apiClient.post('/events', {
            entity_type: 'user',
            entity_id: user?.id,
            event_type: 'stripe_connect_initiated',
            payload: { authorization_url: data.url }
          })

          // Redirect to Stripe after a short delay to show success state
          setTimeout(() => {
            window.location.href = data.url
          }, 1000)
        } else {
          setProcessStatus('error')
          setStatusMessage('Unable to generate connection URL')
          setStripeConnecting(false)
        }
      } else if (method === 'manual') {
        setProcessStatus('success')
        setStatusMessage('Manual payment method configured!')

        // Track event
        apiClient.post('/events', {
          entity_type: 'user',
          entity_id: user?.id,
          event_type: 'manual_payment_selected',
          payload: { method: 'manual' }
        })

        queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
        setTimeout(() => onNext(), 1500)
      }
    },
    onError: (error: any) => {
      setProcessStatus('error')
      setStatusMessage('Failed to configure payment method')
      setStripeConnecting(false)

      displayError(error, {
        operation: 'configure_payment',
        component: 'PaymentConfigStep'
      })
    }
  })

  const handleStripeConnect = () => {
    setStripeConnecting(true)
    setSelectedMethod('stripe')
    configurePaymentMutation.mutate('stripe')
  }

  const handleManualPayment = () => {
    setSelectedMethod('manual')

    try {
      // Immediately update the query cache to reflect manual payment method
      queryClient.setQueryData(['user', 'profile'], (oldData: any) => {
        if (oldData) {
          return { ...oldData, payment_method: 'manual' }
        }
        return oldData
      })

      setProcessStatus('success')
      setStatusMessage('Manual payment method configured!')

      // Track event
      apiClient.post('/events', {
        entity_type: 'user',
        entity_id: user?.id,
        event_type: 'manual_payment_selected',
        payload: { method: 'manual' }
      })

      // Continue to next step
      setTimeout(() => onNext(), 1500)

      // Update server in background
      configurePaymentMutation.mutate('manual')
    } catch (error) {
      console.error('Manual payment error:', error)
      // Fallback: still try the API call
      configurePaymentMutation.mutate('manual')
    }
  }

  const isStripeConnected = user?.stripe_account_id && user?.payment_method === 'stripe'
  const isManualConfigured = user?.payment_method === 'manual'
  const hasPaymentConfigured = isStripeConnected || isManualConfigured

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CreditCard className="h-12 w-12 text-primary-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Configure Payment Processing
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Choose how you'd like to collect payments from your clients.
        </p>
      </div>

      {hasPaymentConfigured && (
        <div className="bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <div className="font-medium text-green-900 dark:text-green-100">
                Payment Method Configured
              </div>
              <div className="text-sm text-green-800 dark:text-green-200">
                {isStripeConnected
                  ? 'Stripe is connected and ready to accept payments.'
                  : 'Manual payment tracking is configured.'
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {!hasPaymentConfigured && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Stripe Option */}
          <Card className={`cursor-pointer transition-all hover:shadow-lg ${
            selectedMethod === 'stripe'
              ? 'ring-2 ring-primary-500 border-primary-200'
              : 'border-gray-200 dark:border-gray-700'
          }`}>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Zap className="h-8 w-8 text-blue-600" />
                  <span className="text-xl font-bold text-blue-600">Stripe</span>
                </div>

                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Automated Payments
                </h4>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Let clients pay online with cards, bank transfers, and more.
                </p>

                <div className="space-y-2 text-xs text-left">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Automatic payment collection</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Payment link generation</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Real-time payment status</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Multiple payment methods</span>
                  </div>
                </div>

                <LoadingButton
                  onClick={handleStripeConnect}
                  isLoading={stripeConnecting || configurePaymentMutation.isPending}
                  loadingText="Connecting to Stripe..."
                  className="w-full mt-6"
                  disabled={configurePaymentMutation.isPending}
                >
                  Connect Stripe
                  <ExternalLink className="h-4 w-4 ml-2" />
                </LoadingButton>
              </div>
            </CardContent>
          </Card>

          {/* Manual Option */}
          <Card className={`cursor-pointer transition-all hover:shadow-lg ${
            selectedMethod === 'manual'
              ? 'ring-2 ring-primary-500 border-primary-200'
              : 'border-gray-200 dark:border-gray-700'
          }`}>
            <CardContent className="p-6">
              <div className="text-center">
                <FileText className="h-8 w-8 text-gray-600 mx-auto mb-4" />

                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Manual Invoicing
                </h4>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Track payments manually - perfect for bank transfers, checks, or cash.
                </p>

                <div className="space-y-2 text-xs text-left">
                  <div className="flex items-center gap-2 text-blue-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Invoice generation & sending</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Payment tracking & reminders</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>No transaction fees</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Full control over process</span>
                  </div>
                </div>

                <LoadingButton
                  onClick={handleManualPayment}
                  isLoading={configurePaymentMutation.isPending && selectedMethod === 'manual'}
                  loadingText="Configuring..."
                  variant="outline"
                  className="w-full mt-6"
                  disabled={configurePaymentMutation.isPending}
                >
                  Use Manual Invoicing
                </LoadingButton>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Process Status Indicator */}
      {processStatus !== 'idle' && (
        <div className="flex justify-center">
          <ProcessStatus
            status={processStatus}
            message={statusMessage}
          />
        </div>
      )}

      {hasPaymentConfigured && (
        <div className="text-center">
          <Button
            onClick={onNext}
            disabled={isLoading}
            size="lg"
            className="w-full sm:w-auto"
          >
            Continue to Invoice Import
          </Button>
        </div>
      )}

      {/* Helpful Tips */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          💡 Payment Method Tips
        </h4>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <div>
            <strong>Choose Stripe if:</strong> You want automated online payments, card processing,
            and payment links for clients.
          </div>
          <div>
            <strong>Choose Manual if:</strong> You prefer bank transfers, checks, or want to avoid
            transaction fees and maintain full control.
          </div>
          <div className="pt-2 text-xs">
            <em>You can always change this setting later in your account preferences.</em>
          </div>
        </div>
      </div>
    </div>
  )
}