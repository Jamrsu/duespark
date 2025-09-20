import React from 'react'
import { Zap } from 'lucide-react'
import { AuroraBackground } from '../ui/aurora-background'

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <AuroraBackground className="min-h-screen items-center justify-center">
      {/* Navigation Bar - Same as Landing Page */}
      <nav className="absolute top-0 left-0 right-0 px-6 py-4 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo - Same as Landing Page */}
          <div className="flex items-center space-x-3">
            <Zap className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">DueSpark</span>
          </div>
        </div>
      </nav>

      {/* Auth Form - Centered */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          {children}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>
            &copy; 2024 DueSpark. Made with ❤️ for better invoicing.
          </p>
        </div>
      </div>
    </AuroraBackground>
  )
}