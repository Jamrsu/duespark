import React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Users,
  Zap,
  ArrowRight,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react'
import { useRegister } from '@/api/hooks'
import { registerSchema, RegisterFormData } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme'

export function RegisterView() {
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const registerMutation = useRegister()
  const { resolvedTheme } = useTheme()

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
    <div className={cn(
      "min-h-screen relative overflow-hidden transition-colors duration-300",
      resolvedTheme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'
    )}>
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
              "relative backdrop-blur-xl border rounded-2xl p-6 sm:p-8 shadow-2xl min-h-[600px] sm:min-h-[700px] flex flex-col justify-center transition-colors duration-300",
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
                  className={cn(
                    "inline-flex items-center gap-2 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-4",
                    resolvedTheme === 'dark'
                      ? 'bg-white/10 text-white'
                      : 'bg-gray-200/50 text-gray-900'
                  )}
                >
                  <Users className="h-4 w-4" />
                  Join the community
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className={cn("text-2xl font-bold mb-2", resolvedTheme === 'dark' ? 'text-white' : 'text-gray-800')}
                >
                  Create your account
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className={cn(resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600')}
                >
                  Start your free trial — no credit card required
                </motion.p>
              </div>

              {/* Form */}
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Email Field */}
                <div>
                  <label className={cn("block text-sm font-medium mb-2", resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700')}>
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className={cn("h-5 w-5 opacity-100", resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-800')} />
                    </div>
                    <input
                      {...register('email')}
                      type="email"
                      autoComplete="email"
                      className={cn(
                        'w-full pl-10 pr-4 py-3 backdrop-blur-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200',
                        resolvedTheme === 'dark'
                          ? 'bg-white/5 border-white/10 text-white placeholder-gray-400'
                          : 'bg-white/80 border-gray-300 text-gray-800 placeholder-gray-500',
                        errors.email && 'border-red-500 focus:ring-red-500'
                      )}
                      placeholder="you@email.com"
                    />
                  </div>
                  {errors.email && (
                    <motion.p
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="mt-2 text-sm text-red-400 flex items-center gap-2"
                    >
                      ⚠ {errors.email.message}
                    </motion.p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label className={cn("block text-sm font-medium mb-2", resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700')}>
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className={cn("h-5 w-5 opacity-100", resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-800')} />
                    </div>
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={cn(
                        'w-full pl-10 pr-12 py-3 backdrop-blur-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200',
                        resolvedTheme === 'dark'
                          ? 'bg-white/5 border-white/10 text-white placeholder-gray-400'
                          : 'bg-white/80 border-gray-300 text-gray-800 placeholder-gray-500',
                        errors.password && 'border-red-500 focus:ring-red-500'
                      )}
                      placeholder="Create a password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className={cn(
                          "h-5 w-5 opacity-100 transition-colors",
                          resolvedTheme === 'dark'
                            ? 'text-gray-400 hover:text-gray-300'
                            : 'text-gray-600 hover:text-gray-700'
                        )} />
                      ) : (
                        <Eye className={cn(
                          "h-5 w-5 opacity-100 transition-colors",
                          resolvedTheme === 'dark'
                            ? 'text-gray-400 hover:text-gray-300'
                            : 'text-gray-600 hover:text-gray-700'
                        )} />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <motion.p
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="mt-2 text-sm text-red-400 flex items-center gap-2"
                    >
                      ⚠ {errors.password.message}
                    </motion.p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className={cn("block text-sm font-medium mb-2", resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700')}>
                    Confirm password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className={cn("h-5 w-5 opacity-100", resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-800')} />
                    </div>
                    <input
                      {...register('confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={cn(
                        'w-full pl-10 pr-12 py-3 backdrop-blur-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200',
                        resolvedTheme === 'dark'
                          ? 'bg-white/5 border-white/10 text-white placeholder-gray-400'
                          : 'bg-white/80 border-gray-300 text-gray-800 placeholder-gray-500',
                        errors.confirmPassword && 'border-red-500 focus:ring-red-500'
                      )}
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className={cn(
                          "h-5 w-5 opacity-100 transition-colors",
                          resolvedTheme === 'dark'
                            ? 'text-gray-400 hover:text-gray-300'
                            : 'text-gray-600 hover:text-gray-700'
                        )} />
                      ) : (
                        <Eye className={cn(
                          "h-5 w-5 opacity-100 transition-colors",
                          resolvedTheme === 'dark'
                            ? 'text-gray-400 hover:text-gray-300'
                            : 'text-gray-600 hover:text-gray-700'
                        )} />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <motion.p
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="mt-2 text-sm text-red-400 flex items-center gap-2"
                    >
                      ⚠ {errors.confirmPassword.message}
                    </motion.p>
                  )}
                </div>

                {/* Referral Code Field */}
                <div>
                  <label className={cn("block text-sm font-medium mb-2", resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700')}>
                    Referral code <span className={cn(resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>(optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Users className={cn("h-5 w-5 opacity-100", resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-800')} />
                    </div>
                    <input
                      {...register('referralCode')}
                      type="text"
                      className={cn(
                        'w-full pl-10 pr-4 py-3 backdrop-blur-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200',
                        resolvedTheme === 'dark'
                          ? 'bg-white/5 border-white/10 text-white placeholder-gray-400'
                          : 'bg-white/80 border-gray-300 text-gray-800 placeholder-gray-500',
                        errors.referralCode && 'border-red-500 focus:ring-red-500'
                      )}
                      placeholder="Enter referral code"
                      maxLength={8}
                    />
                  </div>
                  {errors.referralCode && (
                    <motion.p
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="mt-2 text-sm text-red-400 flex items-center gap-2"
                    >
                      ⚠ {errors.referralCode.message}
                    </motion.p>
                  )}
                  {referralCodeFromUrl && (
                    <motion.p
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="mt-2 text-sm text-blue-400 flex items-center gap-2"
                    >
                      ✓ Referral code applied from invitation link
                    </motion.p>
                  )}
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isSubmitting || registerMutation.isPending}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full relative bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isSubmitting || registerMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </motion.button>

                {/* Terms */}
                <p className={cn("text-xs text-center", resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
                  By creating an account, you agree to our{' '}
                  <Link to="/terms" className="text-purple-400 hover:text-purple-300 underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-purple-400 hover:text-purple-300 underline">
                    Privacy Policy
                  </Link>
                  .
                </p>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className={cn("w-full border-t", resolvedTheme === 'dark' ? 'border-white/10' : 'border-gray-300')} />
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

                {/* Login Link */}
                <div className="text-center">
                  <span className={cn(resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>Already have an account? </span>
                  <Link
                    to="/auth/login"
                    className="text-purple-400 hover:text-purple-300 transition-colors font-medium"
                  >
                    Sign in
                  </Link>
                </div>
              </motion.form>

              {/* Benefits */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                className={cn("mt-8 pt-6 border-t", resolvedTheme === 'dark' ? 'border-white/10' : 'border-gray-300')}
              >
                <div className="space-y-3 text-sm">
                  <div className={cn("flex items-center gap-3", resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span>Unlimited clients on every paid plan</span>
                  </div>
                  <div className={cn("flex items-center gap-3", resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span>Cancel anytime — keep your data forever</span>
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