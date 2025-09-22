import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient } from './client'
import {
  useOptimisticSendReminder,
  useOptimisticUpdateInvoiceStatus,
  useOptimisticCreateInvoice,
  useOptimisticCreateClient
} from '../hooks/useOptimisticMutations'
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  Client,
  CreateClientRequest,
  Invoice,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  Reminder,
  CreateReminderRequest,
  AnalyticsSummary,
  AnalyticsTimeseries,
  Template,
  CreateTemplateRequest,
  EmailPreview,
  EmailPreviewRequest,
} from '../types/api'

// Query Keys
export const queryKeys = {
  auth: ['auth'] as const,
  clients: ['clients'] as const,
  client: (id: number) => ['clients', id] as const,
  invoices: ['invoices'] as const,
  invoice: (id: number) => ['invoices', id] as const,
  reminders: ['reminders'] as const,
  reminder: (id: number) => ['reminders', id] as const,
  analytics: ['analytics'] as const,
  analyticsSummary: ['analytics', 'summary'] as const,
  analyticsTimeseries: (metric: string, interval: string) => 
    ['analytics', 'timeseries', metric, interval] as const,
  templates: ['templates'] as const,
  template: (id: number) => ['templates', id] as const,
}

// Auth Hooks
export function useLogin() {
  return useMutation({
    mutationFn: async (data: LoginRequest): Promise<AuthResponse> => {
      // Convert LoginRequest to Record<string, string> for form data
      const formData: Record<string, string> = {
        username: data.username,
        password: data.password
      }
      const response = await apiClient.postForm<AuthResponse>('/auth/login', formData)
      return response.data
    },
    onSuccess: (data) => {
      apiClient.setToken(data.access_token)
      toast.success('Successfully logged in!')
    },
    onError: (error) => {
      console.error('Login failed:', error)
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: async (data: RegisterRequest): Promise<AuthResponse> => {
      const response = await apiClient.post<AuthResponse>('/auth/register', data)
      return response.data
    },
    onSuccess: (data) => {
      apiClient.setToken(data.access_token)
      toast.success('Account created successfully!')
    },
    onError: (error) => {
      console.error('Registration failed:', error)
    },
  })
}

// Client Hooks
export function useClients(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [...queryKeys.clients, params],
    queryFn: async () => {
      const response = await apiClient.get<Client[]>('/clients', params)
      return response
    },
  })
}

export function useClient(id: number) {
  return useQuery({
    queryKey: queryKeys.client(id),
    queryFn: async () => {
      const response = await apiClient.get<Client>(`/clients/${id}`)
      return response.data
    },
    enabled: id > 0,
  })
}

// Enhanced client creation with optimistic updates
export function useCreateClient() {
  return useOptimisticCreateClient()
}

// Legacy hook for backward compatibility
export function useCreateClientLegacy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateClientRequest): Promise<Client> => {
      const response = await apiClient.post<Client>('/clients', data)
      return response.data
    },
    onSuccess: () => {
      // Invalidate all client queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.clients })
      // Also refetch the current queries to get immediate updates
      queryClient.refetchQueries({ queryKey: queryKeys.clients })
      toast.success('Client created successfully!')
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateClientRequest> }): Promise<Client> => {
      const response = await apiClient.put<Client>(`/clients/${id}`, data)
      return response.data
    },
    onSuccess: (data) => {
      // Invalidate and refetch client list
      queryClient.invalidateQueries({ queryKey: queryKeys.clients })
      queryClient.refetchQueries({ queryKey: queryKeys.clients })
      // Invalidate specific client
      queryClient.invalidateQueries({ queryKey: queryKeys.client(data.id) })
      toast.success('Client updated successfully!')
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/clients/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients })
      toast.success('Client deleted successfully!')
    },
  })
}

// Invoice Hooks
export function useInvoices(params?: { 
  limit?: number; 
  offset?: number; 
  client_id?: number; 
  status?: string;
  date_from?: string;
  date_to?: string;
}) {
  return useQuery({
    queryKey: [...queryKeys.invoices, params],
    queryFn: async () => {
      const response = await apiClient.get<Invoice[]>('/invoices', params)
      return response
    },
  })
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: queryKeys.invoice(id),
    queryFn: async () => {
      const response = await apiClient.get<Invoice>(`/invoices/${id}`)
      return response.data
    },
    enabled: id > 0,
  })
}

// Enhanced invoice creation with optimistic updates
export function useCreateInvoice() {
  return useOptimisticCreateInvoice()
}

// Legacy hook for backward compatibility
export function useCreateInvoiceLegacy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateInvoiceRequest): Promise<Invoice> => {
      const response = await apiClient.post<Invoice>('/invoices', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices })
      queryClient.invalidateQueries({ queryKey: queryKeys.analyticsSummary })
      toast.success('Invoice created successfully!')
    },
  })
}

// Enhanced invoice update with optimistic updates
export function useUpdateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateInvoiceRequest }): Promise<Invoice> => {
      const response = await apiClient.put<Invoice>(`/invoices/${id}`, data)
      return response.data
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.invoices })
      await queryClient.cancelQueries({ queryKey: queryKeys.invoice(id) })

      // Snapshot the previous values
      const previousInvoices = queryClient.getQueryData(queryKeys.invoices)
      const previousInvoice = queryClient.getQueryData(queryKeys.invoice(id))

      // Optimistically update invoices list
      queryClient.setQueryData([...queryKeys.invoices], (old: any) => {
        if (!old?.data) return old
        return {
          ...old,
          data: old.data.map((invoice: Invoice) =>
            invoice.id === id ? { ...invoice, ...data, updated_at: new Date().toISOString() } : invoice
          )
        }
      })

      // Optimistically update single invoice
      queryClient.setQueryData(queryKeys.invoice(id), (old: any) => {
        if (!old) return old
        return { ...old, ...data, updated_at: new Date().toISOString() }
      })

      toast.success('Updating invoice...', { duration: 1500 })

      return { previousInvoices, previousInvoice }
    },
    onError: (error, { id }, context) => {
      // Revert the optimistic update
      if (context?.previousInvoices) {
        queryClient.setQueryData(queryKeys.invoices, context.previousInvoices)
      }
      if (context?.previousInvoice) {
        queryClient.setQueryData(queryKeys.invoice(id), context.previousInvoice)
      }
      toast.error('Failed to update invoice. Please try again.')
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoice(data.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.analyticsSummary })
      toast.success('Invoice updated successfully!')
    },
  })
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/invoices/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices })
      queryClient.invalidateQueries({ queryKey: queryKeys.analyticsSummary })
      toast.success('Invoice deleted successfully!')
    },
  })
}

// Reminder Hooks
export function useReminders(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [...queryKeys.reminders, params],
    queryFn: async () => {
      const response = await apiClient.get<Reminder[]>('/reminders', params)
      return response
    },
  })
}

export function useCreateReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateReminderRequest): Promise<Reminder> => {
      const response = await apiClient.post<Reminder>('/reminders', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reminders })
      toast.success('Reminder created successfully!')
    },
  })
}

export function useUpdateReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateReminderRequest> }): Promise<Reminder> => {
      const response = await apiClient.put<Reminder>(`/reminders/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reminders })
      toast.success('Reminder updated successfully!')
    },
  })
}

export function useDeleteReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/reminders/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reminders })
      toast.success('Reminder deleted successfully!')
    },
  })
}

// Enhanced reminder sending with optimistic updates
export function useSendReminder() {
  return useOptimisticSendReminder()
}

// Legacy hook for backward compatibility
export function useSendReminderLegacy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reminderId: number): Promise<any> => {
      const response = await apiClient.post('/reminders/send-now', { reminder_id: reminderId })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reminders })
      toast.success('Reminder sent successfully!')
    },
  })
}

// Enhanced invoice status update with optimistic updates
export function useUpdateInvoiceStatus() {
  return useOptimisticUpdateInvoiceStatus()
}

// Bulk operations hooks
export function useBulkSendReminders() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (invoiceIds: number[]): Promise<any[]> => {
      const results = []
      for (const invoiceId of invoiceIds) {
        try {
          const response = await apiClient.post(`/invoices/${invoiceId}/remind`, { tone: 'neutral' })
          results.push({ success: true, invoiceId, data: response.data })
        } catch (error) {
          results.push({ success: false, invoiceId, error })
        }
      }
      return results
    },
    onMutate: async (invoiceIds) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.invoices })

      const previousInvoices = queryClient.getQueryData(queryKeys.invoices)

      // Optimistically update all selected invoices
      queryClient.setQueryData(queryKeys.invoices, (old: any) => {
        if (!old?.data) return old

        return {
          ...old,
          data: old.data.map((invoice: any) =>
            invoiceIds.includes(invoice.id)
              ? {
                  ...invoice,
                  last_reminder_sent: new Date().toISOString(),
                  reminder_count: (invoice.reminder_count || 0) + 1
                }
              : invoice
          )
        }
      })

      toast.success(`Sending reminders to ${invoiceIds.length} invoice${invoiceIds.length === 1 ? '' : 's'}...`)

      return { previousInvoices }
    },
    onError: (error, variables, context) => {
      if (context?.previousInvoices) {
        queryClient.setQueryData(queryKeys.invoices, context.previousInvoices)
      }
      toast.error('Some reminders failed to send')
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      if (successful > 0) {
        toast.success(`${successful} reminder${successful === 1 ? '' : 's'} sent successfully!`)
      }

      if (failed > 0) {
        toast.error(`${failed} reminder${failed === 1 ? '' : 's'} failed to send`)
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.invoices })
      queryClient.invalidateQueries({ queryKey: queryKeys.analyticsSummary })
    }
  })
}

// Analytics Hooks
export function useAnalyticsSummary() {
  return useQuery({
    queryKey: queryKeys.analyticsSummary,
    queryFn: async () => {
      return apiClient.get<AnalyticsSummary>('/analytics/summary')
    },
  })
}

export function useAnalyticsTimeseries(metric = 'payments', interval = 'week') {
  return useQuery({
    queryKey: queryKeys.analyticsTimeseries(metric, interval),
    queryFn: async () => {
      const response = await apiClient.get<AnalyticsTimeseries>(
        `/analytics/timeseries?metric=${metric}&interval=${interval}`
      )
      return response.data
    },
  })
}

// Template Hooks
export function useTemplates(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [...queryKeys.templates, params],
    queryFn: async () => {
      const response = await apiClient.get<Template[]>('/templates', params)
      return response
    },
  })
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateTemplateRequest): Promise<Template> => {
      const response = await apiClient.post<Template>('/templates', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates })
      toast.success('Template created successfully!')
    },
  })
}

// Email Preview Hook
export function useEmailPreview() {
  return useMutation({
    mutationFn: async (data: EmailPreviewRequest): Promise<EmailPreview> => {
      const response = await apiClient.post<EmailPreview>('/reminders/preview', data)
      return response.data
    },
  })
}
