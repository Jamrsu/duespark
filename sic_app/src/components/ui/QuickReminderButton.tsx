import React, { useState } from 'react'
import { Send, Clock, Zap, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickReminderButtonProps {
  invoiceId: number
  invoiceAmount?: number
  clientName?: string
  daysPastDue?: number
  onSendReminder?: (invoiceId: number, tone: 'friendly' | 'neutral' | 'firm') => Promise<void>
  className?: string
  variant?: 'compact' | 'expanded'
}

export function QuickReminderButton({
  invoiceId,
  invoiceAmount,
  clientName,
  daysPastDue = 0,
  onSendReminder,
  className,
  variant = 'compact'
}: QuickReminderButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Determine recommended tone based on days past due
  const getRecommendedTone = (): 'friendly' | 'neutral' | 'firm' => {
    if (daysPastDue <= 7) return 'friendly'
    if (daysPastDue <= 21) return 'neutral'
    return 'firm'
  }

  const handleSendReminder = async (tone: 'friendly' | 'neutral' | 'firm') => {
    if (!onSendReminder) return

    setIsLoading(true)
    try {
      await onSendReminder(invoiceId, tone)
      setShowSuccess(true)
      setIsExpanded(false)

      // Hide success state after 2 seconds
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (error) {
      console.error('Failed to send reminder:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const recommendedTone = getRecommendedTone()

  // Success state
  if (showSuccess) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-full',
        'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-300',
        'transition-all duration-200',
        className
      )}>
        <div className="w-4 h-4 rounded-full bg-success-500 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
        </div>
        <span className="text-sm font-medium">Reminder sent!</span>
      </div>
    )
  }

  // Compact variant - just a button
  if (variant === 'compact' && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-full',
          'bg-primary-500 hover:bg-primary-600 text-white',
          'transition-all duration-200 hover:scale-105 active:scale-95',
          'shadow-md hover:shadow-lg',
          className
        )}
        disabled={isLoading}
      >
        <Send className="w-4 h-4" />
        <span className="text-sm font-medium">Remind</span>
      </button>
    )
  }

  // Expanded state with tone options
  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-xl border',
      'border-gray-200 dark:border-gray-700',
      'animate-slide-up',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5 text-primary-500" />
          <span className="font-medium text-gray-900 dark:text-gray-100">
            Send Reminder
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="sr-only">Close</span>
          ×
        </button>
      </div>

      {/* Invoice info */}
      {(clientName || invoiceAmount) && (
        <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
          {clientName && (
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {clientName}
            </div>
          )}
          {invoiceAmount && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Invoice #{invoiceId} • ${invoiceAmount.toFixed(2)}
            </div>
          )}
          {daysPastDue > 0 && (
            <div className="text-sm text-error-600 dark:text-error-400 mt-1">
              {daysPastDue} days overdue
            </div>
          )}
        </div>
      )}

      {/* Tone options */}
      <div className="space-y-2">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Choose reminder tone:
        </div>

        <div className="grid gap-2">
          {/* Friendly */}
          <button
            onClick={() => handleSendReminder('friendly')}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg text-left',
              'border-2 transition-all duration-200',
              'hover:bg-green-50 dark:hover:bg-green-900/10',
              recommendedTone === 'friendly'
                ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-600'
                : 'border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-600'
            )}
          >
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
              <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Friendly
                </span>
                {recommendedTone === 'friendly' && (
                  <span className="px-2 py-1 text-xs bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 rounded-full">
                    Recommended
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                "Hope you're doing well! Just a gentle reminder..."
              </div>
            </div>
          </button>

          {/* Neutral */}
          <button
            onClick={() => handleSendReminder('neutral')}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg text-left',
              'border-2 transition-all duration-200',
              'hover:bg-blue-50 dark:hover:bg-blue-900/10',
              recommendedTone === 'neutral'
                ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
            )}
          >
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Professional
                </span>
                {recommendedTone === 'neutral' && (
                  <span className="px-2 py-1 text-xs bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full">
                    Recommended
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                "This is a reminder regarding invoice payment..."
              </div>
            </div>
          </button>

          {/* Firm */}
          <button
            onClick={() => handleSendReminder('firm')}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg text-left',
              'border-2 transition-all duration-200',
              'hover:bg-red-50 dark:hover:bg-red-900/10',
              recommendedTone === 'firm'
                ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                : 'border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-600'
            )}
          >
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Firm
                </span>
                {recommendedTone === 'firm' && (
                  <span className="px-2 py-1 text-xs bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 rounded-full">
                    Recommended
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                "Payment is significantly overdue. Please remit..."
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
          Sending reminder...
        </div>
      )}
    </div>
  )
}