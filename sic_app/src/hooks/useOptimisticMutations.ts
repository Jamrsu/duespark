import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { apiClient } from '@/api/client'
import type { Client, CreateClientRequest, Invoice, CreateInvoiceRequest } from '@/types/api'

// Types for optimistic updates
interface OptimisticUpdateConfig<TData = any, TVariables = any> {
  queryKey: any[]
  updateFn: (oldData: TData | undefined, variables: TVariables) => TData
  successMessage?: string
  errorMessage?: string
  revalidateQueries?: any[][]
}

// Custom hook for optimistic invoice reminder sending
export function useOptimisticSendReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      invoiceId,
      tone
    }: {
      invoiceId: number
      tone: 'friendly' | 'neutral' | 'firm'
    }) => {
      const response = await apiClient.post(`/invoices/${invoiceId}/remind`, { tone })
      return response.data
    },
    onMutate: async ({ invoiceId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['invoices'] })
      await queryClient.cancelQueries({ queryKey: ['analytics', 'summary'] })

      // Snapshot the previous value
      const previousInvoices = queryClient.getQueryData(['invoices'])
      const previousAnalytics = queryClient.getQueryData(['analytics', 'summary'])

      // Optimistically update invoice list
      queryClient.setQueryData(['invoices'], (old: any) => {
        if (!old?.data) return old

        return {
          ...old,
          data: old.data.map((invoice: any) =>
            invoice.id === invoiceId
              ? {
                  ...invoice,
                  last_reminder_sent: new Date().toISOString(),
                  reminder_count: (invoice.reminder_count || 0) + 1
                }
              : invoice
          )
        }
      })

      // Show optimistic toast
      toast.success('Reminder sent!', {
        duration: 2000,
        icon: '📧'
      })

      return { previousInvoices, previousAnalytics }
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousInvoices) {
        queryClient.setQueryData(['invoices'], context.previousInvoices)
      }
      if (context?.previousAnalytics) {
        queryClient.setQueryData(['analytics', 'summary'], context.previousAnalytics)
      }

      // Show error toast
      toast.error('Failed to send reminder. Please try again.')
      console.error('Reminder send failed:', error)
    },
    onSuccess: () => {
      // Invalidate related queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
    }
  })
}

// Custom hook for optimistic invoice status updates
export function useOptimisticUpdateInvoiceStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      invoiceId,
      status,
      paidDate
    }: {
      invoiceId: number
      status: 'paid' | 'cancelled' | 'pending'
      paidDate?: string
    }) => {
      const response = await apiClient.patch(`/invoices/${invoiceId}`, {
        status,
        paid_date: paidDate
      })
      return response.data
    },
    onMutate: async ({ invoiceId, status, paidDate }) => {
      await queryClient.cancelQueries({ queryKey: ['invoices'] })
      await queryClient.cancelQueries({ queryKey: ['analytics', 'summary'] })

      const previousInvoices = queryClient.getQueryData(['invoices'])
      const previousAnalytics = queryClient.getQueryData(['analytics', 'summary'])

      // Optimistically update invoice
      queryClient.setQueryData(['invoices'], (old: any) => {
        if (!old?.data) return old

        return {
          ...old,
          data: old.data.map((invoice: any) =>
            invoice.id === invoiceId
              ? {
                  ...invoice,
                  status,
                  paid_date: paidDate || invoice.paid_date,
                  updated_at: new Date().toISOString()
                }
              : invoice
          )
        }
      })

      // Update analytics optimistically
      queryClient.setQueryData(['analytics', 'summary'], (old: any) => {
        if (!old?.totals) return old

        const adjustment = status === 'paid' ? 1 : -1
        return {
          ...old,
          totals: {
            ...old.totals,
            paid: old.totals.paid + adjustment,
            pending: old.totals.pending - adjustment,
            overdue: old.totals.overdue > 0 ? old.totals.overdue - adjustment : 0
          }
        }
      })

      // Show success message
      const messages = {
        paid: 'Invoice marked as paid! 🎉',
        cancelled: 'Invoice cancelled',
        pending: 'Invoice status updated'
      }
      toast.success(messages[status])

      return { previousInvoices, previousAnalytics }
    },
    onError: (error, variables, context) => {
      if (context?.previousInvoices) {
        queryClient.setQueryData(['invoices'], context.previousInvoices)
      }
      if (context?.previousAnalytics) {
        queryClient.setQueryData(['analytics', 'summary'], context.previousAnalytics)
      }

      toast.error('Failed to update invoice. Please try again.')
      console.error('Invoice update failed:', error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    }
  })
}

// Custom hook for optimistic invoice creation
export function useOptimisticCreateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (invoiceData: CreateInvoiceRequest): Promise<Invoice> => {
      const response = await apiClient.post<Invoice>('/invoices', invoiceData)
      return response.data
    },
    onMutate: async (newInvoice) => {
      await queryClient.cancelQueries({ queryKey: ['invoices'] })

      const previousInvoices = queryClient.getQueryData(['invoices'])

      // Generate temporary ID for optimistic update
      const tempId = Date.now()
      const optimisticInvoice = {
        id: tempId,
        ...newInvoice,
        status: 'draft' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
        // amount_cents is already in the newInvoice data
      }

      // Optimistically add new invoice
      queryClient.setQueryData(['invoices'], (old: any) => {
        if (!old) return { data: [optimisticInvoice], total: 1 }

        return {
          ...old,
          data: [optimisticInvoice, ...old.data],
          total: (old.total || 0) + 1
        }
      })

      toast.success('Creating invoice...', { duration: 1500 })

      return { previousInvoices, tempId }
    },
    onError: (error, variables, context) => {
      if (context?.previousInvoices) {
        queryClient.setQueryData(['invoices'], context.previousInvoices)
      }

      toast.error('Failed to create invoice. Please try again.')
      console.error('Invoice creation failed:', error)
    },
    onSuccess: (data, variables, context) => {
      // Replace the temporary invoice with the real one
      queryClient.setQueryData(['invoices'], (old: any) => {
        if (!old?.data) return old

        return {
          ...old,
          data: old.data.map((invoice: any) =>
            invoice.id === context?.tempId ? data : invoice
          )
        }
      })

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })

      toast.success('Invoice created successfully! 🎉')
    }
  })
}

// Custom hook for optimistic client creation
export function useOptimisticCreateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (clientData: CreateClientRequest): Promise<Client> => {
      const response = await apiClient.post<Client>('/clients', clientData)
      return response.data
    },
    onMutate: async (newClient) => {
      await queryClient.cancelQueries({ queryKey: ['clients'] })

      const previousClients = queryClient.getQueryData(['clients'])
      const tempId = Date.now()

      const optimisticClient = {
        id: tempId,
        ...newClient,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        invoice_count: 0,
        total_amount_cents: 0
      }

      queryClient.setQueryData(['clients'], (old: any) => {
        if (!old) return { data: [optimisticClient], total: 1 }

        return {
          ...old,
          data: [optimisticClient, ...old.data],
          total: (old.total || 0) + 1
        }
      })

      toast.success('Adding client...', { duration: 1500 })

      return { previousClients, tempId }
    },
    onError: (error, variables, context) => {
      if (context?.previousClients) {
        queryClient.setQueryData(['clients'], context.previousClients)
      }

      toast.error('Failed to add client. Please try again.')
      console.error('Client creation failed:', error)
    },
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData(['clients'], (old: any) => {
        if (!old?.data) return old

        return {
          ...old,
          data: old.data.map((client: any) =>
            client.id === context?.tempId ? data : client
          )
        }
      })

      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client added successfully! 🎉')
    }
  })
}

// Utility hook for bulk operations with progress
export function useOptimisticBulkAction<T extends { id: number }>() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      action,
      items,
      onProgress
    }: {
      action: (item: T) => Promise<any>
      items: T[]
      onProgress?: (completed: number, total: number) => void
    }) => {
      const results = []
      for (let i = 0; i < items.length; i++) {
        try {
          const result = await action(items[i])
          results.push({ success: true, data: result, item: items[i] })
        } catch (error) {
          results.push({ success: false, error, item: items[i] })
        }
        onProgress?.(i + 1, items.length)
      }
      return results
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      if (successful > 0) {
        toast.success(`${successful} item${successful === 1 ? '' : 's'} processed successfully`)
      }

      if (failed > 0) {
        toast.error(`${failed} item${failed === 1 ? '' : 's'} failed to process`)
      }

      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    }
  })
}

// Hook for offline-aware mutations
export function useOfflineAwareMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  config?: OptimisticUpdateConfig<TData, TVariables>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      // Check if online
      if (!navigator.onLine) {
        // Queue the action for background sync
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'QUEUE_ACTION',
            payload: {
              action: 'mutation',
              variables,
              timestamp: Date.now()
            }
          })
        }

        // Apply optimistic update immediately
        if (config?.updateFn && config.queryKey) {
          const previousData = queryClient.getQueryData(config.queryKey)
          const optimisticData = config.updateFn(previousData as TData | undefined, variables)
          queryClient.setQueryData(config.queryKey, optimisticData)
        }

        toast.success('Action queued for sync when online', { duration: 3000 })
        return null as TData
      }

      // Online - perform normal mutation
      return mutationFn(variables)
    },
    onSuccess: (data, variables) => {
      if (navigator.onLine) {
        config?.successMessage && toast.success(config.successMessage)

        // Invalidate related queries
        config?.revalidateQueries?.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey })
        })
      }
    },
    onError: (error) => {
      config?.errorMessage && toast.error(config.errorMessage)
      console.error('Mutation failed:', error)
    }
  })
}