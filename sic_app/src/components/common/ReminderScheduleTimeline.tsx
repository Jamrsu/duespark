import { Clock, CheckCircle, XCircle, AlertCircle, Send } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { StatusBadge } from '../ui/StatusBadge'
import { Button } from '../ui/Button'
import { formatDateTime, cn } from '@/lib/utils'
import { Reminder, ReminderStatus } from '@/types/api'

interface ReminderScheduleTimelineProps {
  reminders: Reminder[]
  onSendNow?: (reminderId: number) => void
  onEditReminder?: (reminder: Reminder) => void
  onDeleteReminder?: (reminderId: number) => void
  isLoading?: boolean
  className?: string
}

export function ReminderScheduleTimeline({
  reminders,
  onSendNow,
  onEditReminder,
  onDeleteReminder,
  isLoading = false,
  className,
}: ReminderScheduleTimelineProps) {
  const sortedReminders = [...reminders].sort((a, b) => 
    new Date(a.send_at).getTime() - new Date(b.send_at).getTime()
  )

  if (sortedReminders.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No reminders scheduled
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Schedule a reminder to automatically follow up on this invoice.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Reminder Schedule
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
          
          <div className="space-y-0">
            {sortedReminders.map((reminder) => (
              <ReminderTimelineItem
                key={reminder.id}
                reminder={reminder}
                onSendNow={onSendNow}
                onEdit={onEditReminder}
                onDelete={onDeleteReminder}
                isLoading={isLoading}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface ReminderTimelineItemProps {
  reminder: Reminder
  onSendNow?: (reminderId: number) => void
  onEdit?: (reminder: Reminder) => void
  onDelete?: (reminderId: number) => void
  isLoading: boolean
}

function ReminderTimelineItem({
  reminder,
  onSendNow,
  onEdit,
  onDelete,
  isLoading,
}: ReminderTimelineItemProps) {
  const sendDate = new Date(reminder.send_at)
  const now = new Date()
  const isPast = sendDate < now
  const isToday = sendDate.toDateString() === now.toDateString()
  
  const getStatusIcon = (status: ReminderStatus) => {
    const iconClass = "h-4 w-4"
    switch (status) {
      case 'sent':
        return <CheckCircle className={cn(iconClass, 'text-success-600 dark:text-success-400')} />
      case 'failed':
        return <XCircle className={cn(iconClass, 'text-error-600 dark:text-error-400')} />
      case 'pending':
        if (isPast) {
          return <AlertCircle className={cn(iconClass, 'text-warning-600 dark:text-warning-400')} />
        }
        return <Clock className={cn(iconClass, 'text-gray-500 dark:text-gray-400')} />
      default:
        return <Clock className={cn(iconClass, 'text-gray-500 dark:text-gray-400')} />
    }
  }

  const getTimelineColor = (status: ReminderStatus) => {
    switch (status) {
      case 'sent':
        return 'bg-success-600 border-success-200'
      case 'failed':
        return 'bg-error-600 border-error-200'
      case 'pending':
        if (isPast) {
          return 'bg-warning-600 border-warning-200'
        }
        return 'bg-gray-300 dark:bg-gray-600 border-gray-100 dark:border-gray-700'
      default:
        return 'bg-gray-300 dark:bg-gray-600 border-gray-100 dark:border-gray-700'
    }
  }

  return (
    <div className="relative pl-14 pr-4 py-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      {/* Timeline dot */}
      <div className={cn(
        'absolute left-4 w-4 h-4 rounded-full border-4',
        'flex items-center justify-center',
        getTimelineColor(reminder.status)
      )}>
        <div className="w-1 h-1 bg-white rounded-full" />
      </div>

      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getStatusIcon(reminder.status)}
              <StatusBadge status={reminder.status} size="sm" />
              {isToday && reminder.status === 'pending' && (
                <span className="text-xs font-medium text-warning-700 dark:text-warning-300 bg-warning-100 dark:bg-warning-900/30 px-2 py-0.5 rounded-full">
                  Due Today
                </span>
              )}
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {formatDateTime(reminder.send_at)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {reminder.status === 'pending' && onSendNow && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSendNow(reminder.id)}
                disabled={isLoading}
                className="text-xs"
              >
                <Send className="h-3 w-3 mr-1" />
                Send Now
              </Button>
            )}
            
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(reminder)}
                disabled={isLoading}
                className="text-xs"
              >
                Edit
              </Button>
            )}
            
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(reminder.id)}
                disabled={isLoading}
                className="text-xs text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300"
              >
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        {reminder.subject && (
          <div className="text-sm">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              Subject: 
            </span>{' '}
            <span className="text-gray-600 dark:text-gray-400">
              {reminder.subject}
            </span>
          </div>
        )}

        {reminder.channel && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="capitalize">via {reminder.channel}</span>
            {reminder.channel === 'email' && (
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            )}
            {reminder.channel === 'sms' && (
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Compact timeline for mobile/small spaces
export function CompactReminderTimeline({
  reminders,
  maxItems = 3,
  onViewAll,
}: {
  reminders: Reminder[]
  maxItems?: number
  onViewAll?: () => void
}) {
  const sortedReminders = [...reminders]
    .sort((a, b) => new Date(a.send_at).getTime() - new Date(b.send_at).getTime())
    .slice(0, maxItems)

  const hasMore = reminders.length > maxItems

  if (reminders.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-gray-500">
        No reminders scheduled
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sortedReminders.map((reminder) => (
        <div key={reminder.id} className="flex items-center gap-3 py-2">
          <StatusBadge status={reminder.status} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
              {reminder.subject || 'Payment reminder'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatDateTime(reminder.send_at)}
            </div>
          </div>
        </div>
      ))}
      
      {hasMore && onViewAll && (
        <Button variant="ghost" size="sm" onClick={onViewAll} className="w-full">
          View all {reminders.length} reminders
        </Button>
      )}
    </div>
  )
}