import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Zap,
  Sparkles,
  Shield,
  Clock,
  CheckCircle,
} from 'lucide-react'
import { useLogin } from '@/api/hooks'
import { loginSchema, LoginFormData } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import '../../styles/hero-theme.css'

export function LoginView() {
  const [showPassword, setShowPassword] = React.useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const loginMutation = useLogin()

  const from = location.state?.from?.pathname || '/app/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await loginMutation.mutateAsync({
        username: data.email, // API expects username field
        password: data.password,
      })
      navigate(from, { replace: true })
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
            <Link to="/auth/register" className="primary-button px-4 py-2 rounded-lg font-semibold btn-hover animate-scale-in">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-12 lg:py-20">
        <div className="w-full max-w-6xl grid lg:grid-cols-[1.15fr,1fr] gap-12 items-center">
          <div className="space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/80 border border-white/60 text-sm font-medium text-muted-foreground px-4 py-2 rounded-full mx-auto lg:mx-0 animate-scale-in">
              <Sparkles className="h-4 w-4 text-blue-600" />
              AI-powered reminders
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight animate-fade-in-up">
              Welcome back to <span className="gradient-text">DueSpark</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed animate-fade-in-up-delay-1">
              Sign in to stay on top of invoices, automate follow-ups, and keep cash flow predictable.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 animate-fade-in-up-delay-2">
              <div className="bg-white/90 border border-white/60 rounded-xl p-5 shadow-sm card-hover flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground">Secure by design</h3>
                  <p className="text-sm text-muted-foreground">
                    Bank-level safeguards, MFA, and encrypted workflows protect every login.
                  </p>
                </div>
              </div>
              <div className="bg-white/90 border border-white/60 rounded-xl p-5 shadow-sm card-hover flex items-start gap-3">
                <Clock className="h-5 w-5 text-purple-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground">Faster payments</h3>
                  <p className="text-sm text-muted-foreground">
                    Automated nudges help clients pay an average of 35% faster.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-container bg-white/95 rounded-2xl shadow-2xl p-8 lg:p-10 animate-fade-in-right">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold animate-scale-in">
                <Lock className="h-3.5 w-3.5" />
                Secure sign-in
              </div>
              <h2 className="text-2xl font-bold text-foreground mt-4">
                Access your workspace
              </h2>
              <p className="text-muted-foreground mt-2">
                Use your email and password to continue managing invoices.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-muted-foreground mb-2"
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
                    autoComplete="current-password"
                    className={cn(
                      'input-field w-full pl-10 pr-10 py-3 rounded-lg',
                      errors.password && 'border-red-500 focus:border-red-500'
                    )}
                    placeholder="Enter your password"
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

              {/* Submit button */}
              <button
                type="submit"
                className="primary-button w-full py-3 rounded-lg font-semibold btn-hover"
                disabled={isSubmitting || loginMutation.isPending}
              >
                {isSubmitting || loginMutation.isPending ? 'Signing in...' : 'Sign in'}
              </button>

              {/* Demo credentials */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-700 mb-2 font-medium">
                  Demo credentials
                </p>
                <p className="text-xs text-blue-600">
                  Email: demo@example.com<br />
                  Password: demo123
                </p>
              </div>

              {/* Register link */}
              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link
                  to="/auth/register"
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Sign up
                </Link>
              </div>
            </form>

            <div className="mt-8 flex flex-col gap-3 text-sm text-gray-500">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                14-day free trial on every new workspace
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Cancel anytime — no credit card required to start
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
