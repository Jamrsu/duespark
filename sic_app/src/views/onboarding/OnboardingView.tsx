import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Circle, ArrowRight, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StepProgress, LoadingContent, LoadingSpinner } from '@/components/ui/LoadingStates'
import { AccountCreationStep } from './steps/AccountCreationStep'
import { PaymentConfigStep } from './steps/PaymentConfigStep'
import { InvoiceImportStep } from './steps/InvoiceImportStep'
import { apiClient } from '@/api/client'
import { toast } from 'react-hot-toast'
import type { User } from '@/types/api'

export type OnboardingStatus =
  | 'not_started'
  | 'account_created'
  | 'email_verified'
  | 'payment_configured'
  | 'completed'

interface OnboardingStep {
  id: number
  title: string
  description: string
  status: 'pending' | 'current' | 'completed'
  component: React.ComponentType<any>
}

export function OnboardingView() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSkipping, setIsSkipping] = useState(false)

  // Get current user and onboarding status
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const response = await apiClient.get<User>('/auth/me')
      return response.data
    }
  })

  // Track onboarding events
  const trackEventMutation = useMutation({
    mutationFn: async (eventType: string) => {
      await apiClient.post('/events', {
        entity_type: 'user',
        entity_id: user?.id,
        event_type: eventType,
        payload: { step: currentStep }
      })
    }
  })

  // Update onboarding status
  const updateStatusMutation = useMutation({
    mutationFn: async (status: OnboardingStatus) => {
      console.log('Updating onboarding status to:', status)
      const response = await apiClient.put('/auth/me', {
        onboarding_status: status
      })
      console.log('Status update response:', response.data)
      return response.data
    },
    onSuccess: (data) => {
      console.log('Status update succeeded:', data)
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
    },
    onError: (error) => {
      console.error('Status update failed:', error)
    }
  })

  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: 'Account Setup',
      description: 'Verify your email and complete your profile',
      status: 'pending',
      component: AccountCreationStep
    },
    {
      id: 2,
      title: 'Payment Configuration',
      description: 'Connect Stripe or set up manual invoicing',
      status: 'pending',
      component: PaymentConfigStep
    },
    {
      id: 3,
      title: 'Import & Preview',
      description: 'Import invoices and set up reminders',
      status: 'pending',
      component: InvoiceImportStep
    }
  ]

  // Update step statuses based on user onboarding status
  useEffect(() => {
    if (user?.onboarding_status) {
      const status = user.onboarding_status
      let newCurrentStep = 0

      switch (status) {
        case 'completed':
          newCurrentStep = 3
          break
        case 'payment_configured':
          newCurrentStep = 2
          break
        case 'email_verified':
          newCurrentStep = 1
          break
        case 'account_created':
          newCurrentStep = 0
          break
        default:
          newCurrentStep = 0
      }

      setCurrentStep(Math.min(newCurrentStep, 2)) // Max step is 2 (0-indexed)
    }
  }, [user?.onboarding_status])

  // Get the current step component, default to first step while loading
  const CurrentStepComponent = steps[currentStep]?.component || steps[0]?.component

  // Track onboarding start
  useEffect(() => {
    if (user && user.onboarding_status === 'not_started') {
      trackEventMutation.mutate('onboarding_started')
      updateStatusMutation.mutate('account_created')
    }
  }, [user])

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)

      // Update status based on step completion
      const statusMap: Record<number, OnboardingStatus> = {
        0: 'email_verified',
        1: 'payment_configured',
        2: 'completed'
      }

      if (statusMap[currentStep]) {
        // Optimistically update cache first
        queryClient.setQueryData(['user', 'profile'], (oldData: any) => {
          if (oldData) {
            return { ...oldData, onboarding_status: statusMap[currentStep] }
          }
          return oldData
        })

        // Update server in background
        updateStatusMutation.mutate(statusMap[currentStep])
      }
    } else {
      // Complete onboarding
      try {
        // Immediately update the query cache to reflect completed status
        queryClient.setQueryData(['user', 'profile'], (oldData: any) => {
          if (oldData) {
            return { ...oldData, onboarding_status: 'completed' }
          }
          return oldData
        })

        // Track completion and show success message
        trackEventMutation.mutate('onboarding_completed')
        toast.success('Welcome to DueSpark! Your account is ready to use.')

        // Navigate to dashboard
        navigate('/dashboard')

        // Update status on server in background
        updateStatusMutation.mutate('completed')
      } catch (error) {
        console.error('Complete setup error:', error)
        // Even if anything fails, still try to navigate
        toast.success('Welcome to DueSpark! Your account is ready to use.')
        navigate('/dashboard')
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = async () => {
    console.log('=== SKIP CLICKED ===')
    setIsSkipping(true)
    try {
      // Track the skip event (fire and forget)
      trackEventMutation.mutate('onboarding_skipped')

      // Immediately update the query cache to reflect completed status
      // This prevents the RequireOnboardingComplete guard from redirecting back
      console.log('Updating cache to completed status')
      queryClient.setQueryData(['user', 'profile'], (oldData: any) => {
        console.log('Cache update - oldData:', oldData)
        if (oldData) {
          const newData = { ...oldData, onboarding_status: 'completed' }
          console.log('Cache update - newData:', newData)
          return newData
        }
        return oldData
      })

      // Show success message
      toast.success('Onboarding skipped. You can complete setup later from settings.')

      // Navigate to dashboard
      console.log('Navigating to dashboard...')
      navigate('/dashboard', { replace: true })

      // Update status on server in background
      console.log('Starting server update...')
      updateStatusMutation.mutate('completed')
    } catch (error) {
      console.error('Skip error:', error)
      // Even if anything fails, still try to navigate
      toast.success('Onboarding skipped. You can complete setup later from settings.')
      navigate('/dashboard', { replace: true })
    } finally {
      setIsSkipping(false)
    }
  }

  // Redirect to dashboard if already completed (must be before any early returns)
  useEffect(() => {
    if (user?.onboarding_status === 'completed') {
      navigate('/dashboard')
    }
  }, [user?.onboarding_status, navigate])

  // Show loading only in header while allowing UI to be interactive
  if (isLoading) {
    // Allow the UI to render but show loading state in header
    // This prevents blocking the entire interface while user data loads
  }

  // If already completed, show loading while redirecting
  if (user?.onboarding_status === 'completed') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to DueSpark
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Let's get your invoice management system set up in just a few steps
          </p>
          {isLoading && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Loading your account...</span>
            </div>
          )}
        </div>

        {/* Progress Steps */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <StepProgress
              currentStep={currentStep + 1}
              totalSteps={steps.length}
              stepLabels={steps.map(step => step.title)}
              className="px-4"
            />
          </CardContent>
        </Card>

        {/* Current Step Content */}
        {CurrentStepComponent && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  Step {currentStep + 1}: {steps[currentStep].title}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  disabled={isSkipping}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {isSkipping ? 'Skipping...' : 'Skip for now'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CurrentStepComponent
                user={user}
                onNext={handleNext}
                onBack={handleBack}
                isLoading={updateStatusMutation.isPending}
              />
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={isSkipping}
            >
              {isSkipping ? 'Skipping...' : 'Skip Setup'}
            </Button>
            <Button
              onClick={handleNext}
              disabled={updateStatusMutation.isPending || isLoading}
              className="flex items-center gap-2"
            >
              {currentStep === steps.length - 1 ? 'Complete Setup' : 'Next Step'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}