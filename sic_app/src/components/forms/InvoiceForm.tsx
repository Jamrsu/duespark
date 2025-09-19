import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CalendarDays, DollarSign, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { CreateInvoiceRequest } from '@/types/api'

// Validation schema
const invoiceSchema = z.object({
  client_id: z.coerce.number().min(1, 'Please select a client'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than $0.01'),
  currency: z.string().min(1, 'Currency is required').default('USD'),
  due_date: z.string().min(1, 'Due date is required'),
  status: z.enum(['draft', 'pending', 'paid', 'overdue', 'cancelled']).default('draft'),
})

type InvoiceFormData = z.infer<typeof invoiceSchema>

interface InvoiceFormProps {
  clients: Array<{ id: number; name: string; email: string }>
  onSubmit: (data: CreateInvoiceRequest) => void
  isLoading?: boolean
  defaultValues?: Partial<InvoiceFormData>
  submitButtonText?: string
  loadingButtonText?: string
}

export function InvoiceForm({
  clients,
  onSubmit,
  isLoading = false,
  defaultValues,
  submitButtonText = 'Create Invoice',
  loadingButtonText = 'Creating...'
}: InvoiceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      currency: 'USD',
      status: 'draft',
      ...defaultValues
    }
  })

  const selectedClientId = watch('client_id')
  const amount = watch('amount')

  const handleFormSubmit = (data: InvoiceFormData) => {
    // Convert amount to cents and prepare API request
    const requestData: CreateInvoiceRequest = {
      client_id: data.client_id,
      amount_cents: Math.round(data.amount * 100),
      currency: data.currency,
      due_date: data.due_date,
      status: data.status
    }
    
    onSubmit(requestData)
  }

  const formatAmountDisplay = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Invoice Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              <User className="h-4 w-4 inline mr-1" />
              Client *
            </label>
            <select
              {...register('client_id')}
              id="client_id"
              className={`
                block w-full px-3 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors tap-target
                ${errors.client_id 
                  ? 'border-error-500 bg-error-50 dark:bg-error-900/20' 
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                }
              `}
              aria-invalid={errors.client_id ? 'true' : 'false'}
              aria-describedby={errors.client_id ? 'client_id-error' : undefined}
            >
              <option value="">Select a client...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.email})
                </option>
              ))}
            </select>
            {errors.client_id && (
              <p id="client_id-error" role="alert" className="text-sm text-error-600 dark:text-error-400">
                {errors.client_id.message}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Amount *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-lg font-medium">$</span>
              </div>
              <input
                {...register('amount')}
                type="number"
                step="0.01"
                min="0"
                id="amount"
                placeholder="0.00"
                className={`
                  block w-full pl-8 pr-3 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors tap-target
                  ${errors.amount 
                    ? 'border-error-500 bg-error-50 dark:bg-error-900/20' 
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                  }
                `}
                aria-invalid={errors.amount ? 'true' : 'false'}
                aria-describedby={errors.amount ? 'amount-error amount-help' : 'amount-help'}
              />
            </div>
            {amount > 0 && (
              <p id="amount-help" className="text-sm text-gray-500 dark:text-gray-400">
                Invoice total: {formatAmountDisplay(amount)}
              </p>
            )}
            {errors.amount && (
              <p id="amount-error" role="alert" className="text-sm text-error-600 dark:text-error-400">
                {errors.amount.message}
              </p>
            )}
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Currency
            </label>
            <select
              {...register('currency')}
              id="currency"
              className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors tap-target"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CAD">CAD - Canadian Dollar</option>
            </select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              <CalendarDays className="h-4 w-4 inline mr-1" />
              Due Date *
            </label>
            <input
              {...register('due_date')}
              type="date"
              id="due_date"
              min={new Date().toISOString().split('T')[0]}
              className={`
                block w-full px-3 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors tap-target
                ${errors.due_date 
                  ? 'border-error-500 bg-error-50 dark:bg-error-900/20' 
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                }
              `}
              aria-invalid={errors.due_date ? 'true' : 'false'}
              aria-describedby={errors.due_date ? 'due_date-error' : undefined}
            />
            {errors.due_date && (
              <p id="due_date-error" role="alert" className="text-sm text-error-600 dark:text-error-400">
                {errors.due_date.message}
              </p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Initial Status
            </label>
            <select
              {...register('status')}
              id="status"
              className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors tap-target"
            >
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
            </select>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Draft invoices can be edited later. Pending invoices are ready to send.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={() => reset()}
          disabled={isSubmitting || isLoading}
        >
          Reset Form
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="order-first sm:order-none"
        >
          {isSubmitting || isLoading ? loadingButtonText : submitButtonText}
        </Button>
      </div>

      {/* Selected Client Preview */}
      {selectedClientId && (
        <Card className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
          <CardContent className="pt-4">
            <div className="text-sm">
              <span className="font-medium text-primary-700 dark:text-primary-300">
                Invoice will be created for:{' '}
              </span>
              <span className="text-primary-600 dark:text-primary-400">
                {clients.find(c => c.id === Number(selectedClientId))?.name}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </form>
  )
}