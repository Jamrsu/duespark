import React from 'react'
import { Zap } from 'lucide-react'
import { Card } from '../ui/Card'

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              DueSpark
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Smart invoice management made simple
          </p>
        </div>

        {/* Auth Form */}
        <Card className="shadow-lg">
          {children}
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
          <p>
            &copy; 2024 DueSpark. Made with ❤️ for better invoicing.
          </p>
        </div>
      </div>
    </div>
  )
}