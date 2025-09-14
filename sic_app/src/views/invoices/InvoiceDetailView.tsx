import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ReminderScheduleTimeline } from '@/components/common/ReminderScheduleTimeline'
import { useInvoice, useReminders } from '@/api/hooks'
import { formatCurrency, formatDate } from '@/lib/utils'

export function InvoiceDetailView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const invoiceId = parseInt(id || '0')
  
  const { data: invoice, isLoading } = useInvoice(invoiceId)
  const { data: remindersData } = useReminders({ limit: 10, offset: 0 })
  
  // Filter reminders for this invoice (simplified)
  const reminders = (remindersData?.data || []).filter(r => r.invoice_id === invoiceId)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="loading-shimmer h-10 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="loading-shimmer h-6 w-32" />
                  <div className="loading-shimmer h-4 w-full" />
                  <div className="loading-shimmer h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <div className="loading-shimmer h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
          Invoice not found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          The invoice you're looking for doesn't exist.
        </p>
        <Button variant="ghost" onClick={() => navigate('/invoices')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoices
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/invoices')}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Invoice #{invoice.id}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Created {formatDate(invoice.created_at)}
          </p>
        </div>
        <StatusBadge status={invoice.status} size="lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Amount
                    </label>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(invoice.amount_cents, invoice.currency)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Due Date
                    </label>
                    <p className="text-lg text-gray-900 dark:text-gray-100">
                      {formatDate(invoice.due_date)}
                    </p>
                  </div>
                </div>
                
                {invoice.paid_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Paid Date
                    </label>
                    <p className="text-lg text-success-600 dark:text-success-400">
                      {formatDate(invoice.paid_at)}
                    </p>
                  </div>
                )}
                
                <div className="flex gap-2 pt-4">
                  <Button size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Reminder
                  </Button>
                  <Button variant="secondary" size="sm">
                    Edit Invoice
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reminder Timeline */}
          <ReminderScheduleTimeline
            reminders={reminders}
            onSendNow={(id) => console.log('Send reminder', id)}
            onEditReminder={(reminder) => console.log('Edit reminder', reminder)}
            onDeleteReminder={(id) => console.log('Delete reminder', id)}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Client ID
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    #{invoice.client_id}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/clients/${invoice.client_id}`)}
                  className="w-full"
                >
                  View Client Details
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Created</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {formatDate(invoice.created_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Status</span>
                  <StatusBadge status={invoice.status} size="sm" />
                </div>
                {invoice.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Paid</span>
                    <span className="text-success-600 dark:text-success-400">
                      {formatDate(invoice.paid_at)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}