import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SwipeableCard, swipeActions } from '@/components/ui/SwipeableCard'
import { QuickReminderButton } from '@/components/ui/QuickReminderButton'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Clock, AlertCircle, CheckCircle, Calendar } from 'lucide-react'

interface Invoice {
  id: number
  client_name: string
  amount_cents: number
  currency: string
  due_date: string
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled'
  days_past_due?: number
  created_at: string
}

interface MobileInvoiceListProps {
  invoices: Invoice[]
  onSendReminder?: (invoiceId: number, tone: 'friendly' | 'neutral' | 'firm') => Promise<void>
  onMarkPaid?: (invoiceId: number) => Promise<void>
  onDelete?: (invoiceId: number) => Promise<void>
  loading?: boolean
  className?: string
}

export function MobileInvoiceList({
  invoices,
  onSendReminder,
  onMarkPaid,
  onDelete,
  loading = false,
  className
}: MobileInvoiceListProps) {
  const navigate = useNavigate()
  const [expandedReminder, setExpandedReminder] = useState<number | null>(null)

  const getStatusIcon = (status: string, daysPastDue?: number) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-success-500" />
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-error-500" />
      case 'pending':
        return daysPastDue && daysPastDue > 0
          ? <Clock className="w-5 h-5 text-warning-500" />
          : <Calendar className="w-5 h-5 text-primary-500" />
      case 'draft':
        return <Clock className="w-5 h-5 text-gray-400" />
      default:
        return <Calendar className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-success-600 bg-success-50 border-success-200'
      case 'overdue':
        return 'text-error-600 bg-error-50 border-error-200'
      case 'pending':
        return 'text-warning-600 bg-warning-50 border-warning-200'
      case 'draft':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getDaysPastDueText = (daysPastDue?: number) => {
    if (!daysPastDue || daysPastDue <= 0) return null
    return `${daysPastDue} day${daysPastDue === 1 ? '' : 's'} overdue`
  }

  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="loading-shimmer h-5 w-32" />
              <div className="loading-shimmer h-6 w-16 rounded-full" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="loading-shimmer h-7 w-24" />
              <div className="loading-shimmer h-4 w-20" />
            </div>
            <div className="loading-shimmer h-4 w-40" />
          </div>
        ))}
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No invoices found
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Get started by creating your first invoice
        </p>
        <button
          onClick={() => navigate('/invoices/new')}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
        >
          Create Invoice
        </button>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {invoices.map((invoice) => {
        const leftActions = []
        const rightActions = []

        // Configure swipe actions based on invoice status
        if (invoice.status === 'pending' || invoice.status === 'overdue') {
          leftActions.push({
            ...swipeActions.remind,
            action: () => setExpandedReminder(expandedReminder === invoice.id ? null : invoice.id)
          })

          rightActions.push({
            ...swipeActions.markPaid,
            action: () => onMarkPaid?.(invoice.id)
          })
        }

        if (invoice.status === 'draft') {
          leftActions.push({
            ...swipeActions.edit,
            action: () => navigate(`/invoices/${invoice.id}/edit`)
          })
        }

        // Always allow viewing
        if (leftActions.length === 0) {
          leftActions.push({
            ...swipeActions.view,
            action: () => navigate(`/invoices/${invoice.id}`)
          })
        }

        // Allow deletion for draft invoices
        if (invoice.status === 'draft') {
          rightActions.push({
            ...swipeActions.delete,
            action: () => onDelete?.(invoice.id)
          })
        }

        return (
          <SwipeableCard
            key={invoice.id}
            leftActions={leftActions}
            rightActions={rightActions}
            onSwipe={(direction, actionId) => {
              console.log(`Swiped ${direction} on invoice ${invoice.id}, action: ${actionId}`)
            }}
          >
            <div
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 transition-colors"
              onClick={() => navigate(`/invoices/${invoice.id}`)}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(invoice.status, invoice.days_past_due)}
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {invoice.client_name}
                  </span>
                </div>
                <span className={cn(
                  'px-2 py-1 text-xs font-medium rounded-full border capitalize',
                  getStatusColor(invoice.status)
                )}>
                  {invoice.status}
                </span>
              </div>

              {/* Amount and due date */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(invoice.amount_cents, invoice.currency)}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Due {new Date(invoice.due_date).toLocaleDateString()}
                  </div>
                  {invoice.days_past_due && invoice.days_past_due > 0 && (
                    <div className="text-xs text-error-600 dark:text-error-400 font-medium">
                      {getDaysPastDueText(invoice.days_past_due)}
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice details */}
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Invoice #{invoice.id}</span>
                <span>
                  Created {new Date(invoice.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Expanded reminder component */}
              {expandedReminder === invoice.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <QuickReminderButton
                    invoiceId={invoice.id}
                    invoiceAmount={invoice.amount_cents / 100}
                    clientName={invoice.client_name}
                    daysPastDue={invoice.days_past_due || 0}
                    onSendReminder={onSendReminder}
                    variant="expanded"
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </SwipeableCard>
        )
      })}
    </div>
  )
}