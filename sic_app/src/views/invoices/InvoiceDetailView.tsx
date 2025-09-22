import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Clock, Edit } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ReminderScheduleTimeline } from '@/components/common/ReminderScheduleTimeline'
import { useInvoice, useReminders, useCreateReminder, useUpdateReminder, useDeleteReminder } from '@/api/hooks'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useState } from 'react'
import toast from 'react-hot-toast'

export function InvoiceDetailView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const invoiceId = parseInt(id || '0')
  const [isCreatingReminder, setIsCreatingReminder] = useState(false)
  const [editingReminder, setEditingReminder] = useState<number | null>(null)

  const { data: invoice, isLoading } = useInvoice(invoiceId)
  const { data: remindersData } = useReminders({ limit: 100, offset: 0 })
  const createReminder = useCreateReminder()
  const updateReminder = useUpdateReminder()
  const deleteReminder = useDeleteReminder()

  // Filter reminders for this invoice
  const reminders = (remindersData?.data || []).filter(r => r.invoice_id === invoiceId)

  const handleSendReminder = async () => {
    if (!invoice) return

    // Check for existing pending reminders
    const pendingReminders = reminders.filter(r => r.status === 'pending')
    if (pendingReminders.length > 0) {
      toast.error('There are already pending reminders scheduled for this invoice. Please edit or delete existing reminders instead of creating duplicates.')
      return
    }

    setIsCreatingReminder(true)
    try {
      // Create a reminder for tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(9, 0, 0, 0) // 9 AM tomorrow

      await createReminder.mutateAsync({
        invoice_id: invoiceId,
        send_at: tomorrow.toISOString(),
        channel: 'email',
        subject: `Payment Reminder - Invoice #${invoice.id}`,
        body: `Hello,\n\nThis is a friendly reminder that your invoice #${invoice.id} for ${formatCurrency(invoice.amount_cents, invoice.currency)} is due on ${formatDate(invoice.due_date)}.\n\nThank you for your business.`
      })

      toast.success('Reminder scheduled successfully!')
    } catch (error) {
      console.error('Failed to create reminder:', error)
      toast.error('Failed to schedule reminder. Please try again.')
    } finally {
      setIsCreatingReminder(false)
    }
  }

  const handleEditInvoice = () => {
    navigate(`/app/invoices/${invoiceId}/edit`)
  }

  const handleEditReminder = async (reminder: any) => {
    // For now, just prompt for a new date and update the reminder
    const newDateStr = prompt('Enter new reminder date (YYYY-MM-DD HH:MM):',
      reminder.send_at.split('T')[0] + ' ' + reminder.send_at.split('T')[1].substring(0, 5)
    )

    if (!newDateStr) return

    try {
      setEditingReminder(reminder.id)
      const newDate = new Date(newDateStr)

      if (isNaN(newDate.getTime())) {
        toast.error('Invalid date format. Please use YYYY-MM-DD HH:MM')
        return
      }

      await updateReminder.mutateAsync({
        id: reminder.id,
        data: {
          send_at: newDate.toISOString(),
          subject: reminder.subject,
          body: reminder.body,
          channel: reminder.channel
        }
      })

      toast.success('Reminder updated successfully!')
    } catch (error) {
      console.error('Failed to update reminder:', error)
      toast.error('Failed to update reminder. Please try again.')
    } finally {
      setEditingReminder(null)
    }
  }

  const handleDeleteReminder = async (reminderId: number) => {
    if (!confirm('Are you sure you want to delete this reminder?')) {
      return
    }

    try {
      await deleteReminder.mutateAsync(reminderId)
      toast.success('Reminder deleted successfully!')
    } catch (error) {
      console.error('Failed to delete reminder:', error)
      toast.error('Failed to delete reminder. Please try again.')
    }
  }

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
        <Button variant="ghost" onClick={() => navigate('/app/invoices')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoices
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="glass-panel p-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app/invoices')}
          className="p-2 hover:bg-white/20 dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Invoice #{invoice.id}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Created {formatDate(invoice.created_at)}
          </p>
        </div>
        <StatusBadge status={invoice.status} size="lg" />
      </section>

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
                  <Button
                    size="sm"
                    onClick={handleSendReminder}
                    disabled={isCreatingReminder || invoice.status === 'paid'}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {isCreatingReminder ? 'Scheduling...' : 'Send Reminder'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleEditInvoice}
                  >
                    <Edit className="h-4 w-4 mr-2" />
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
            onEditReminder={handleEditReminder}
            onDeleteReminder={handleDeleteReminder}
            isLoading={editingReminder !== null || deleteReminder.isPending}
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
                  onClick={() => navigate(`/app/clients/${invoice.client_id}`)}
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
