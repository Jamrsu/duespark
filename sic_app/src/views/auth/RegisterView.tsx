import React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Lock, Eye, EyeOff, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useRegister } from '@/api/hooks'
import { registerSchema, RegisterFormData } from '@/lib/schemas'
import { cn } from '@/lib/utils'

export function RegisterView() {
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const registerMutation = useRegister()

  // Get referral code from URL parameters
  const referralCodeFromUrl = searchParams.get('ref') || ''

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      referralCode: referralCodeFromUrl,
    },
  })

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerMutation.mutateAsync({
        email: data.email,
        password: data.password,
        referral_code: data.referralCode || undefined,
      })
      navigate('/app/dashboard', { replace: true })
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  return (
    <div className="p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create your account
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Get started with DueSpark today
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email field */}
        <div>
          <label 
            htmlFor="email" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Email address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-gray-400" />
            </div>
            <input
              {...register('email')}
              type="email"
              id="email"
              autoComplete="email"
              className={cn(
                'input pl-10',
                errors.email && 'border-error-500 focus:ring-error-500'
              )}
              placeholder="Enter your email"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-error-600 dark:text-error-400">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password field */}
        <div>
          <label 
            htmlFor="password" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-gray-400" />
            </div>
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              className={cn(
                'input pl-10 pr-10',
                errors.password && 'border-error-500 focus:ring-error-500'
              )}
              placeholder="Create a password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-error-600 dark:text-error-400">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password field */}
        <div>
          <label 
            htmlFor="confirmPassword" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Confirm password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-gray-400" />
            </div>
            <input
              {...register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              autoComplete="new-password"
              className={cn(
                'input pl-10 pr-10',
                errors.confirmPassword && 'border-error-500 focus:ring-error-500'
              )}
              placeholder="Confirm your password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-error-600 dark:text-error-400">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Referral Code field */}
        <div>
          <label
            htmlFor="referralCode"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Referral code <span className="text-gray-500">(optional)</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Users className="h-4 w-4 text-gray-400" />
            </div>
            <input
              {...register('referralCode')}
              type="text"
              id="referralCode"
              className={cn(
                'input pl-10',
                errors.referralCode && 'border-error-500 focus:ring-error-500'
              )}
              placeholder="Enter referral code"
              maxLength={8}
            />
          </div>
          {errors.referralCode && (
            <p className="mt-1 text-sm text-error-600 dark:text-error-400">
              {errors.referralCode.message}
            </p>
          )}
          {referralCodeFromUrl && (
            <p className="mt-1 text-sm text-primary-600 dark:text-primary-400">
              ✓ Referral code applied from invitation link
            </p>
          )}
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          className="w-full"
          isLoading={isSubmitting || registerMutation.isPending}
          disabled={isSubmitting || registerMutation.isPending}
        >
          Create account
        </Button>

        {/* Terms */}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>

        {/* Login link */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link 
              to="/auth/login" 
              className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 focus-ring rounded"
            >
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </div>
  )
}