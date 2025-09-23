import React from 'react'
import { Link, useNavigate, useLocation, type Location } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Zap,
  ArrowRight,
  CheckCircle,
  Github,
  ArrowLeft,
} from 'lucide-react'
import { useLogin } from '@/api/hooks'
import { loginSchema, LoginFormData } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme'
import { EnhancedFormField } from '@/components/ui/EnhancedFormField'
import { Button } from '@/components/ui/Button'
import { SkipNavigation } from '@/components/ui/SkipNavigation'
import { useAccessibility } from '@/components/ui/AccessibilityProvider'

export function LoginView() {
  const navigate = useNavigate()
  const location = useLocation()
  const loginMutation = useLogin()
  const { resolvedTheme } = useTheme()
  const { announcePageChange, announceSuccess, announceFormError } = useAccessibility()

  const locationState = location.state as { from?: Location } | undefined
  const storedRedirect = React.useMemo(() => sessionStorage.getItem('postLoginRedirect'), [])
  const fromStatePath = locationState?.from
    ? `${locationState.from.pathname}${locationState.from.search ?? ''}${locationState.from.hash ?? ''}`
    : undefined
  const from = fromStatePath || storedRedirect || '/app/dashboard'

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const watchedValues = watch()

  // Announce page change for screen readers
  React.useEffect(() => {
    announcePageChange('Login')
  }, [announcePageChange])

  const fillDemoCredentials = () => {
    setValue('email', 'demo@example.com')
    setValue('password', 'demo123')
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      await loginMutation.mutateAsync({
        username: data.email,
        password: data.password,
      })
      announceSuccess('Successfully logged in. Redirecting to dashboard.')
      sessionStorage.removeItem('postLoginRedirect')
      navigate(from, { replace: true })
    } catch (error) {
      // Error handling is done by the mutation, but we can announce it
      announceFormError('Login form', 'Invalid email or password. Please try again.')
    }
  }

  return (
    <div className={cn(
      "min-h-screen relative overflow-hidden transition-colors duration-300 mobile-full-height",
      resolvedTheme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'
    )}>
      {/* Skip Navigation */}
      <SkipNavigation />

      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br transition-colors duration-300",
          resolvedTheme === 'dark'
            ? 'from-purple-900/20 via-blue-900/20 to-indigo-900/20'
            : 'from-purple-100/30 via-blue-100/30 to-indigo-100/30'
        )} />
        <div className={cn(
          "absolute top-0 left-1/4 w-96 h-96 rounded-full mix-blend-multiply filter blur-xl animate-pulse",
          resolvedTheme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-300/20'
        )} />
        <div className={cn(
          "absolute top-1/2 right-1/4 w-96 h-96 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000",
          resolvedTheme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-300/20'
        )} />
        <div className={cn(
          "absolute bottom-0 left-1/3 w-96 h-96 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000",
          resolvedTheme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-300/20'
        )} />
      </div>

      {/* Simplified Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-end">
          <Link
            to="/"
            className={cn(
              "group flex items-center gap-2 px-4 py-2 backdrop-blur-sm border rounded-lg transition-all duration-200",
              resolvedTheme === 'dark'
                ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                : 'bg-gray-200/50 border-gray-300 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
            )}
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="text-sm font-medium">Back</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 min-h-[calc(100vh-120px)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-lg mx-auto"
        >
          {/* Glassmorphic Card */}
          <div className="relative">
            {/* Card Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl blur-xl" />

            {/* Main Card */}
            <div className={cn(
              "relative backdrop-blur-xl border rounded-2xl p-6 sm:p-8 shadow-2xl min-h-[500px] sm:min-h-[600px] flex flex-col justify-center transition-colors duration-300",
              resolvedTheme === 'dark'
                ? 'bg-white/5 border-white/10'
                : 'bg-white/70 border-gray-200'
            )}>
              {/* Branding */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center mb-8 mt-8"
              >
                <div className="inline-flex flex-col items-center gap-4">
                  {/* Logo */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                  >
                    <Zap className={cn("h-12 w-12", resolvedTheme === 'dark' ? 'text-white' : 'text-gray-700')} />
                  </motion.div>

                  {/* Brand Name */}
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className={cn("text-3xl font-bold tracking-tight", resolvedTheme === 'dark' ? 'text-white' : 'text-gray-800')}
                  >
                    DueSpark
                  </motion.h2>
                </div>
              </motion.div>

              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className={cn("inline-flex items-center gap-2 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-4", resolvedTheme === 'dark' ? 'bg-white/10 text-white' : 'bg-gray-200/80 text-gray-800')}
                >
                  <Lock className="h-4 w-4" />
                  Secure Login
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className={cn("text-2xl font-bold mb-2", resolvedTheme === 'dark' ? 'text-white' : 'text-gray-800')}
                >
                  Welcome back
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className={cn(resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600')}
                >
                  Sign in to your DueSpark account
                </motion.p>
              </div>

              {/* Form */}
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6"
                noValidate
                id="main-content"
              >
                {/* Email Field */}
                <EnhancedFormField
                  label="Email"
                  name="email"
                  type="email"
                  value={watchedValues.email}
                  placeholder="Enter your email"
                  error={errors.email?.message}
                  validationState={errors.email ? 'invalid' : 'idle'}
                  leftIcon={<Mail className="h-5 w-5" />}
                  autoComplete="email"
                  required
                  validateOnBlur
                  onChange={(value) => setValue('email', value)}
                  inputClassName={cn(
                    'backdrop-blur-sm transition-all duration-200',
                    resolvedTheme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white placeholder-gray-400'
                      : 'bg-white/80 border-gray-300 text-gray-800 placeholder-gray-500'
                  )}
                />

                {/* Password Field */}
                <EnhancedFormField
                  label="Password"
                  name="password"
                  type="password"
                  value={watchedValues.password}
                  placeholder="Enter your password"
                  error={errors.password?.message}
                  validationState={errors.password ? 'invalid' : 'idle'}
                  leftIcon={<Lock className="h-5 w-5" />}
                  autoComplete="current-password"
                  required
                  validateOnBlur
                  onChange={(value) => setValue('password', value)}
                  inputClassName={cn(
                    'backdrop-blur-sm transition-all duration-200',
                    resolvedTheme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white placeholder-gray-400'
                      : 'bg-white/80 border-gray-300 text-gray-800 placeholder-gray-500'
                  )}
                />

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between text-sm">
                  <label className={cn(
                    "flex items-center",
                    resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  )}>
                    <input
                      type="checkbox"
                      className={cn(
                        "w-4 h-4 border rounded focus:ring-purple-500 focus:ring-2 text-purple-500",
                        resolvedTheme === 'dark'
                          ? 'bg-white/5 border-white/10'
                          : 'bg-white border-gray-300'
                      )}
                    />
                    <span className="ml-2">Remember me</span>
                  </label>
                  <Link
                    to="/auth/forgot-password"
                    className={cn(
                      "transition-colors",
                      resolvedTheme === 'dark'
                        ? 'text-purple-400 hover:text-purple-300'
                        : 'text-purple-600 hover:text-purple-700'
                    )}
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={isSubmitting || loginMutation.isPending}
                  disabled={isSubmitting || loginMutation.isPending}
                  leftIcon={!isSubmitting && !loginMutation.isPending ? undefined : undefined}
                  rightIcon={!isSubmitting && !loginMutation.isPending ? <ArrowRight className="h-4 w-4" /> : undefined}
                  ariaLabel="Sign in to your account"
                  className={cn(
                    "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",
                    "focus:ring-purple-500 shadow-lg hover:shadow-xl"
                  )}
                >
                  {isSubmitting || loginMutation.isPending ? 'Signing in...' : 'Sign in'}
                </Button>

                {/* Demo Credentials */}
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  fullWidth
                  onClick={fillDemoCredentials}
                  leftIcon={<Github className="h-4 w-4" />}
                  ariaLabel="Fill in demo account credentials"
                  className={cn(
                    "backdrop-blur-sm border transition-all duration-200",
                    resolvedTheme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      : 'bg-gray-200/80 border-gray-300 text-gray-900 hover:bg-gray-200'
                  )}
                >
                  Try Demo Account
                </Button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className={cn(
                      "w-full border-t",
                      resolvedTheme === 'dark' ? 'border-white/10' : 'border-gray-300'
                    )} />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className={cn(
                      "px-2",
                      resolvedTheme === 'dark'
                        ? 'bg-gray-950 text-gray-400'
                        : 'bg-gray-50 text-gray-500'
                    )}>or</span>
                  </div>
                </div>

                {/* Register Link */}
                <div className="text-center">
                  <span className={cn(
                    resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  )}>Don't have an account? </span>
                  <Link
                    to="/auth/register"
                    className={cn(
                      "transition-colors font-medium",
                      resolvedTheme === 'dark'
                        ? 'text-purple-400 hover:text-purple-300'
                        : 'text-purple-600 hover:text-purple-700'
                    )}
                  >
                    Sign up
                  </Link>
                </div>
              </motion.form>

              {/* Benefits */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                className={cn(
                  "mt-8 pt-6 border-t",
                  resolvedTheme === 'dark' ? 'border-white/10' : 'border-gray-300'
                )}
              >
                <div className="space-y-3 text-sm">
                  <div className={cn(
                    "flex items-center gap-3",
                    resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  )}>
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span>14-day free trial on every new workspace</span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-3",
                    resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  )}>
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span>Cancel anytime — no credit card required</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
