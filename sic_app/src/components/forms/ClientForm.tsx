import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Mail, Phone, Globe } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { CreateClientRequest } from '@/types/api'

// Validation schema
const clientSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  contact_name: z.string().max(100, 'Contact name must be less than 100 characters').optional(),
  contact_phone: z.string().max(20, 'Phone number must be less than 20 characters').optional(),
  timezone: z.string().optional(),
})

type ClientFormData = z.infer<typeof clientSchema>

interface ClientFormProps {
  onSubmit: (data: CreateClientRequest) => void
  isLoading?: boolean
  defaultValues?: Partial<ClientFormData>
  isEditing?: boolean
}

export function ClientForm({
  onSubmit,
  isLoading = false,
  defaultValues,
  isEditing = false
}: ClientFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      timezone: '',
      ...defaultValues
    }
  })

  const name = watch('name')
  const email = watch('email')
  const contactName = watch('contact_name')
  const contactPhone = watch('contact_phone')

  const handleFormSubmit = (data: ClientFormData) => {
    // Prepare API request
    const requestData: CreateClientRequest = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      contact_name: data.contact_name?.trim() || undefined,
      contact_phone: data.contact_phone?.trim() || undefined,
      timezone: data.timezone || undefined
    }
    
    onSubmit(requestData)
  }

  // Common timezones for convenience
  const commonTimezones = [
    { value: '', label: 'Select timezone (optional)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  ]

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Client Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Client Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              <User className="h-4 w-4 inline mr-1" />
              Client Name *
            </label>
            <input
              {...register('name')}
              type="text"
              id="name"
              placeholder="Enter client name"
              className={`
                block w-full px-3 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors tap-target
                ${errors.name 
                  ? 'border-error-500 bg-error-50 dark:bg-error-900/20' 
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                }
              `}
              aria-invalid={errors.name ? 'true' : 'false'}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <p id="name-error" role="alert" className="text-sm text-error-600 dark:text-error-400">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              <Mail className="h-4 w-4 inline mr-1" />
              Email Address *
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              placeholder="client@example.com"
              className={`
                block w-full px-3 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors tap-target
                ${errors.email 
                  ? 'border-error-500 bg-error-50 dark:bg-error-900/20' 
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                }
              `}
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error email-help' : 'email-help'}
            />
            <p id="email-help" className="text-sm text-gray-500 dark:text-gray-400">
              This email will be used for sending invoices and reminders
            </p>
            {errors.email && (
              <p id="email-error" role="alert" className="text-sm text-error-600 dark:text-error-400">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Contact Name */}
          <div className="space-y-2">
            <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              <User className="h-4 w-4 inline mr-1" />
              Contact Person
            </label>
            <input
              {...register('contact_name')}
              type="text"
              id="contact_name"
              placeholder="Contact person's name"
              className={`
                block w-full px-3 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors tap-target
                ${errors.contact_name 
                  ? 'border-error-500 bg-error-50 dark:bg-error-900/20' 
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                }
              `}
              aria-invalid={errors.contact_name ? 'true' : 'false'}
              aria-describedby={errors.contact_name ? 'contact_name-error contact_name-help' : 'contact_name-help'}
            />
            <p id="contact_name-help" className="text-sm text-gray-500 dark:text-gray-400">
              The primary contact person for this client
            </p>
            {errors.contact_name && (
              <p id="contact_name-error" role="alert" className="text-sm text-error-600 dark:text-error-400">
                {errors.contact_name.message}
              </p>
            )}
          </div>

          {/* Contact Phone */}
          <div className="space-y-2">
            <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              <Phone className="h-4 w-4 inline mr-1" />
              Phone Number
            </label>
            <input
              {...register('contact_phone')}
              type="tel"
              id="contact_phone"
              placeholder="+1 (555) 123-4567"
              className={`
                block w-full px-3 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors tap-target
                ${errors.contact_phone 
                  ? 'border-error-500 bg-error-50 dark:bg-error-900/20' 
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                }
              `}
              aria-invalid={errors.contact_phone ? 'true' : 'false'}
              aria-describedby={errors.contact_phone ? 'contact_phone-error contact_phone-help' : 'contact_phone-help'}
            />
            <p id="contact_phone-help" className="text-sm text-gray-500 dark:text-gray-400">
              Phone number for the primary contact person
            </p>
            {errors.contact_phone && (
              <p id="contact_phone-error" role="alert" className="text-sm text-error-600 dark:text-error-400">
                {errors.contact_phone.message}
              </p>
            )}
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              <Globe className="h-4 w-4 inline mr-1" />
              Timezone
            </label>
            <select
              {...register('timezone')}
              id="timezone"
              className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors tap-target"
              aria-describedby="timezone-help"
            >
              {commonTimezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p id="timezone-help" className="text-sm text-gray-500 dark:text-gray-400">
              Used for scheduling reminders at appropriate times
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
          {isSubmitting || isLoading
            ? (isEditing ? 'Saving...' : 'Creating...')
            : (isEditing ? 'Save Client' : 'Create Client')
          }
        </Button>
      </div>

      {/* Client Preview */}
      {(name || email || contactName || contactPhone) && (
        <Card className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
          <CardContent className="pt-4">
            <div className="text-sm space-y-1">
              <div className="font-medium text-primary-700 dark:text-primary-300">
                Preview:
              </div>
              {name && (
                <div className="text-primary-600 dark:text-primary-400">
                  <strong>Company:</strong> {name}
                </div>
              )}
              {email && (
                <div className="text-primary-600 dark:text-primary-400">
                  <strong>Email:</strong> {email.toLowerCase()}
                </div>
              )}
              {contactName && (
                <div className="text-primary-600 dark:text-primary-400">
                  <strong>Contact:</strong> {contactName}
                </div>
              )}
              {contactPhone && (
                <div className="text-primary-600 dark:text-primary-400">
                  <strong>Phone:</strong> {contactPhone}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </form>
  )
}