import React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Users,
  Zap,
  Sparkles,
  CheckCircle,
  Shield,
  Rocket,
} from 'lucide-react'
import { useRegister } from '@/api/hooks'
import { registerSchema, RegisterFormData } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import '../../styles/hero-theme.css'

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
    <div className="min-h-screen hero-gradient flex flex-col">
      <nav className="px-6 py-4 animate-fade-in-up">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Zap className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-foreground">DueSpark</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/#features" className="text-muted-foreground hover:text-foreground transition-colors animate-scale-in">
              Features
            </Link>
            <Link to="/#pricing" className="text-muted-foreground hover:text-foreground transition-colors animate-scale-in">
              Pricing
            </Link>
            <Link to="/#about" className="text-muted-foreground hover:text-foreground transition-colors animate-scale-in">
              About
            </Link>
            <Link to="/#contact" className="text-muted-foreground hover:text-foreground transition-colors animate-scale-in">
              Contact
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/auth/login" className="text-muted-foreground hover:text-foreground transition-colors animate-scale-in">
              Log in
            </Link>
            <Link to="/auth/register" className="primary-button px-4 py-2 rounded-lg font-semibold btn-hover animate-scale-in">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-12 lg:py-20">
        <div className="w-full max-w-6xl grid lg:grid-cols-[1.1fr,1fr] gap-12 items-center">
          <div className="space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/80 border border-white/60 text-sm font-medium text-muted-foreground px-4 py-2 rounded-full mx-auto lg:mx-0 animate-scale-in">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Launch in minutes
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight animate-fade-in-up">
              Create your <span className="gradient-text">DueSpark</span> account
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed animate-fade-in-up-delay-1">
              Automate reminders, unlock AI insights, and manage every invoice in one modern workspace.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 animate-fade-in-up-delay-2">
              <div className="bg-white/90 border border-white/60 rounded-xl p-5 shadow-sm card-hover flex items-start gap-3">
                <Rocket className="h-5 w-5 text-purple-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground">Put growth on autopilot</h3>
                  <p className="text-sm text-muted-foreground">
                    Guided onboarding and smart templates get your billing engine running fast.
                  </p>
                </div>
              </div>
              <div className="bg-white/90 border border-white/60 rounded-xl p-5 shadow-sm card-hover flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground">Built for compliance</h3>
                  <p className="text-sm text-muted-foreground">
                    SOC 2-ready controls and audit trails keep finance teams confident.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-container bg-white/95 rounded-2xl shadow-2xl p-8 lg:p-10 animate-fade-in-right">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold animate-scale-in">
                <Users className="h-3.5 w-3.5" />
                Join the community
              </div>
              <h2 className="text-2xl font-bold text-foreground mt-4">
                Start your free trial
              </h2>
              <p className="text-muted-foreground mt-2">
                Create a workspace for your team—no credit card required.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-muted-foreground mb-2"
                >
                  Work email
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
                      'input-field w-full pl-10 pr-4 py-3 rounded-lg',
                      errors.email && 'border-red-500 focus:border-red-500'
                    )}
                    placeholder="you@company.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-muted-foreground mb-2"
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
                      'input-field w-full pl-10 pr-10 py-3 rounded-lg',
                      errors.password && 'border-red-500 focus:border-red-500'
                    )}
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400 hover:text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400 hover:text-muted-foreground" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password field */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-muted-foreground mb-2"
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
                      'input-field w-full pl-10 pr-10 py-3 rounded-lg',
                      errors.confirmPassword && 'border-red-500 focus:border-red-500'
                    )}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400 hover:text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400 hover:text-muted-foreground" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Referral Code field */}
              <div>
                <label
                  htmlFor="referralCode"
                  className="block text-sm font-medium text-muted-foreground mb-2"
                >
                  Referral code <span className="text-muted-foreground">(optional)</span>
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
                      'input-field w-full pl-10 pr-4 py-3 rounded-lg',
                      errors.referralCode && 'border-red-500 focus:border-red-500'
                    )}
                    placeholder="Enter referral code"
                    maxLength={8}
                  />
                </div>
                {errors.referralCode && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.referralCode.message}
                  </p>
                )}
                {referralCodeFromUrl && (
                  <p className="mt-1 text-sm text-blue-600">
                    ✓ Referral code applied from invitation link
                  </p>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="primary-button w-full py-3 rounded-lg font-semibold btn-hover"
                disabled={isSubmitting || registerMutation.isPending}
              >
                {isSubmitting || registerMutation.isPending ? 'Creating account...' : 'Create account'}
              </button>

              {/* Terms */}
              <p className="text-xs text-muted-foreground text-center">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </p>

              {/* Login link */}
              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link
                  to="/auth/login"
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </form>

            <div className="mt-8 flex flex-col gap-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Unlimited clients on every paid plan
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Switch plans or cancel anytime — keep your data forever
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
