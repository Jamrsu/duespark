import { z } from 'zod'

// Auth schemas
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
})

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(128, 'Password must be less than 128 characters'),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
    referralCode: z
      .string()
      .optional()
      .refine((value) => !value || (value.length === 8 && /^[A-Z0-9]+$/.test(value)), {
        message: "Referral code must be 8 characters long and contain only letters and numbers"
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>

// Client schemas
export const clientSchema = z.object({
  name: z
    .string()
    .min(1, 'Client name is required')
    .max(255, 'Name must be less than 255 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),
  timezone: z
    .string()
    .optional()
    .default('UTC'),
})

export type ClientFormData = z.infer<typeof clientSchema>

// Invoice schemas
export const invoiceSchema = z.object({
  client_id: z
    .number({
      required_error: 'Please select a client',
      invalid_type_error: 'Please select a client',
    })
    .positive('Please select a client'),
  amount_cents: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .positive('Amount must be greater than 0')
    .max(999999999, 'Amount is too large'), // $9,999,999.99
  currency: z
    .string()
    .min(1, 'Currency is required')
    .length(3, 'Currency must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency must be 3 uppercase letters'),
  due_date: z
    .string()
    .min(1, 'Due date is required')
    .refine(
      (date) => {
        const parsed = new Date(date)
        return !isNaN(parsed.getTime())
      },
      { message: 'Please enter a valid date' }
    )
    .refine(
      (date) => {
        const parsed = new Date(date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return parsed >= today
      },
      { message: 'Due date cannot be in the past' }
    ),
  status: z
    .enum(['draft', 'pending', 'paid', 'overdue', 'cancelled'])
    .default('pending'),
})

export const updateInvoiceSchema = z.object({
  status: z
    .enum(['draft', 'pending', 'paid', 'overdue', 'cancelled'])
    .optional(),
  paid_at: z
    .string()
    .nullable()
    .optional()
    .refine(
      (date) => {
        if (!date) return true
        const parsed = new Date(date)
        return !isNaN(parsed.getTime())
      },
      { message: 'Please enter a valid date and time' }
    ),
})

export type InvoiceFormData = z.infer<typeof invoiceSchema>
export type UpdateInvoiceFormData = z.infer<typeof updateInvoiceSchema>

// Reminder schemas  
export const reminderSchema = z.object({
  invoice_id: z
    .number({
      required_error: 'Please select an invoice',
      invalid_type_error: 'Please select an invoice',
    })
    .positive('Please select an invoice'),
  send_at: z
    .string()
    .min(1, 'Send date is required')
    .refine(
      (date) => {
        const parsed = new Date(date)
        return !isNaN(parsed.getTime())
      },
      { message: 'Please enter a valid date and time' }
    )
    .refine(
      (date) => {
        const parsed = new Date(date)
        const now = new Date()
        return parsed > now
      },
      { message: 'Send date must be in the future' }
    ),
  channel: z
    .enum(['email', 'sms', 'whatsapp'])
    .default('email'),
  subject: z
    .string()
    .max(255, 'Subject must be less than 255 characters')
    .optional(),
  body: z
    .string()
    .max(2000, 'Message must be less than 2000 characters')
    .optional(),
})

export type ReminderFormData = z.infer<typeof reminderSchema>

// Template schemas
export const templateSchema = z.object({
  name: z
    .string()
    .min(1, 'Template name is required')
    .max(255, 'Name must be less than 255 characters'),
  tone: z
    .enum(['friendly', 'neutral', 'firm'])
    .default('friendly'),
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(255, 'Subject must be less than 255 characters'),
  body_markdown: z
    .string()
    .min(1, 'Template body is required')
    .max(5000, 'Template body must be less than 5000 characters'),
})

export type TemplateFormData = z.infer<typeof templateSchema>

// Search and filter schemas
export const invoiceFiltersSchema = z.object({
  client_id: z.number().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
})

export const clientFiltersSchema = z.object({
  search: z.string().optional(),
})

export type InvoiceFilters = z.infer<typeof invoiceFiltersSchema>
export type ClientFilters = z.infer<typeof clientFiltersSchema>

// Settings schemas
export const profileSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  current_password: z
    .string()
    .optional(),
  new_password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .optional()
    .or(z.literal('')),
  confirm_password: z
    .string()
    .optional()
    .or(z.literal('')),
})
.refine(
  (data) => {
    if (data.new_password && !data.confirm_password) {
      return false
    }
    if (data.new_password !== data.confirm_password) {
      return false
    }
    return true
  },
  {
    message: "Passwords don't match",
    path: ['confirm_password'],
  }
)
.refine(
  (data) => {
    if (data.new_password && !data.current_password) {
      return false
    }
    return true
  },
  {
    message: 'Current password is required to set a new password',
    path: ['current_password'],
  }
)

export type ProfileFormData = z.infer<typeof profileSchema>

// Validation helpers
export function validateCurrency(currency: string): boolean {
  return /^[A-Z]{3}$/.test(currency)
}

export function validateAmount(amount: string): number | null {
  const num = parseFloat(amount)
  if (isNaN(num) || num <= 0) return null
  return Math.round(num * 100) // Convert to cents
}

export function formatAmountForInput(amountCents: number): string {
  return (amountCents / 100).toFixed(2)
}