import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, User, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LoadingButton, ProcessStatus } from '@/components/ui/LoadingStates'
import { apiClient } from '@/api/client'
import { toast } from 'react-hot-toast'
import { displayError } from '@/utils/errorHandling'

const profileSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface AccountCreationStepProps {
  user: any
  onNext: () => void
  onBack: () => void
  isLoading: boolean
}

export function AccountCreationStep({ user, onNext, isLoading }: AccountCreationStepProps) {
  const queryClient = useQueryClient()
  const [verificationSent, setVerificationSent] = useState(!!user?.email_verification_token)
  const [isCheckingVerification, setIsCheckingVerification] = useState(false)
  const [lastSentTime, setLastSentTime] = useState<Date | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [verificationAttempts, setVerificationAttempts] = useState(0)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: user?.email || ''
    }
  })

  // Cooldown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            if (interval) clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [resendCooldown])

  // Send verification email
  const sendVerificationMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiClient.post('/auth/send-verification', { email })
      return response.data
    },
    onSuccess: (data) => {
      setVerificationSent(true)
      setLastSentTime(new Date())
      setResendCooldown(60) // 60 second cooldown

      // Show appropriate success message
      if (data.demo_auto_verified) {
        toast.success('Demo mode: Email auto-verified! In production, check your inbox.', { duration: 5000 })
        // Auto-refresh user data to show verified state
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })
        }, 1000)
      } else {
        toast.success('Verification email sent! Please check your inbox.', { duration: 4000 })
      }

      // Track event
      apiClient.post('/events', {
        entity_type: 'user',
        entity_id: user?.id,
        event_type: 'email_verification_sent',
        payload: {
          email: user?.email,
          demo_auto_verified: data.demo_auto_verified
        }
      })
    },
    onError: (error: any) => {
      displayError(error, {
        operation: 'send_verification_email',
        component: 'AccountCreationStep'
      })
    }
  })

  // Check verification status
  const checkVerificationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.get('/auth/me')
      return response.data
    },
    onSuccess: (data) => {
      setVerificationAttempts(prev => prev + 1)

      if (data.email_verified) {
        toast.success('Email verified successfully! Welcome to SIC! 🎉', { duration: 4000 })
        queryClient.invalidateQueries({ queryKey: ['user', 'profile'] })

        // Track event
        apiClient.post('/events', {
          entity_type: 'user',
          entity_id: user?.id,
          event_type: 'email_verified',
          payload: {
            email: data.email,
            verification_attempts: verificationAttempts + 1
          }
        })

        setTimeout(() => onNext(), 1500)
      } else {
        // Provide helpful feedback based on attempt count
        if (verificationAttempts >= 2) {
          toast.error(
            'Still not verified. Email may take a few minutes to arrive. Try checking spam folder.',
            { duration: 6000 }
          )
        } else {
          toast.info('Email not verified yet. Please click the link in the email first.', { duration: 4000 })
        }
      }
    },
    onError: (error: any) => {
      displayError(error, {
        operation: 'check_verification_status',
        component: 'AccountCreationStep'
      })
    }
  })

  const handleSendVerification = (data: ProfileFormData) => {
    sendVerificationMutation.mutate(data.email)
  }

  const handleCheckVerification = async () => {
    setIsCheckingVerification(true)
    await checkVerificationMutation.mutateAsync()
    setIsCheckingVerification(false)
  }

  const isEmailVerified = user?.email_verified

  return (
    <div className="space-y-6">
      <div className="text-center">
        <User className="h-12 w-12 text-primary-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Complete Your Account
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          We need to verify your email address to secure your account and enable invoice notifications.
        </p>
      </div>

      {/* Email Status */}
      <div className={`
        p-4 rounded-lg border-2 ${
          isEmailVerified
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
            : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
        }
      `}>
        <div className="flex items-center gap-3">
          {isEmailVerified ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-600" />
          )}
          <div>
            <div className="font-medium">
              {isEmailVerified ? 'Email Verified' : 'Email Verification Required'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {isEmailVerified
                ? 'Your email has been verified successfully. You can now receive invoice notifications, account updates, and use password recovery features.'
                : 'Please verify your email address to continue.'
              }
            </div>
          </div>
        </div>
      </div>

      {!isEmailVerified && (
        <form onSubmit={handleSubmit(handleSendVerification)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Mail className="h-4 w-4 inline mr-1" />
              Email Address
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              readOnly
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg"
            />
            {errors.email && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {errors.email.message}
              </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              This email will be used for sending invoices and account notifications.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <LoadingButton
              type="submit"
              isLoading={sendVerificationMutation.isPending}
              loadingText="Sending verification email..."
              disabled={verificationSent}
              className="flex-1"
            >
              {verificationSent ? 'Verification Email Sent' : 'Send Verification Email'}
            </LoadingButton>
          </div>
        </form>
      )}

      {verificationSent && !isEmailVerified && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <div className="font-medium text-blue-900 dark:text-blue-100">
                  Check Your Email
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  We've sent a verification link to <strong>{user?.email}</strong>.
                  Click the link in the email to verify your account.
                </div>
                {lastSentTime && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    Sent {Math.floor((Date.now() - lastSentTime.getTime()) / 1000 / 60)} minutes ago
                  </div>
                )}
                <div className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                  <div>💡 <strong>Tip:</strong> Check your spam folder if you don't see the email within a few minutes.</div>
                  {verificationAttempts > 0 && (
                    <div>🔄 <strong>Checked {verificationAttempts} time{verificationAttempts > 1 ? 's' : ''}</strong> - Keep trying!</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <LoadingButton
            onClick={handleCheckVerification}
            isLoading={isCheckingVerification}
            loadingText="Checking verification status..."
            variant="outline"
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            I've Verified My Email
          </LoadingButton>

          <div className="text-center">
            {resendCooldown > 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Resend available in {resendCooldown} seconds
              </div>
            ) : (
              <LoadingButton
                onClick={() => sendVerificationMutation.mutate(user?.email)}
                isLoading={sendVerificationMutation.isPending}
                loadingText="Sending again..."
                variant="ghost"
                size="sm"
                className="text-primary-600 hover:text-primary-700 underline"
              >
                Didn't receive the email? Send again
              </LoadingButton>
            )}
          </div>
        </div>
      )}

      {isEmailVerified && (
        <div className="text-center mb-8">
          <LoadingButton
            onClick={onNext}
            isLoading={isLoading}
            loadingText="Continuing to payment setup..."
            size="lg"
            className="w-full sm:w-auto"
          >
            Continue to Payment Setup
          </LoadingButton>
        </div>
      )}

      {/* Email Verification Help */}
      {!isEmailVerified && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
            📧 Email Not Arriving?
          </h4>
          <div className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="font-medium">Common Solutions:</div>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• Check spam/junk folder</li>
                  <li>• Wait 5-10 minutes</li>
                  <li>• Ensure {user?.email} is correct</li>
                  <li>• Check email provider settings</li>
                </ul>
              </div>
              <div>
                <div className="font-medium">Still Having Issues?</div>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• Try resending after cooldown</li>
                  <li>• Contact your IT administrator</li>
                  <li>• Use a different email provider</li>
                  <li>• Check firewall settings</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Helpful Tips */}
      {!isEmailVerified && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
            🔐 Why Email Verification?
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Secure your account from unauthorized access</li>
            <li>• Enable invoice and reminder notifications</li>
            <li>• Recover your account if you forget your password</li>
            <li>• Comply with security best practices</li>
          </ul>
        </div>
      )}
    </div>
  )
}