import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient } from './client'
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

export function useCreateClient() {
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

export function useCreateInvoice() {
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

export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateInvoiceRequest }): Promise<Invoice> => {
      const response = await apiClient.put<Invoice>(`/invoices/${id}`, data)
      return response.data
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

export function useSendReminder() {
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

// Analytics Hooks
export function useAnalyticsSummary() {
  return useQuery({
    queryKey: queryKeys.analyticsSummary,
    queryFn: async () => {
      const response = await apiClient.get<AnalyticsSummary>('/analytics/summary')
      return response.data
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