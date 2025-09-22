import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { InvoiceForm } from '@/components/forms/InvoiceForm'
import { useClients, useInvoice, useUpdateInvoice } from '@/api/hooks'
import { UpdateInvoiceRequest } from '@/types/api'

export function InvoiceEditView() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const invoiceId = parseInt(id || '0')

  const { data: invoice, isLoading: invoiceLoading } = useInvoice(invoiceId)
  const { data: clientsData, isLoading: clientsLoading } = useClients({ limit: 100, offset: 0 })
  const updateInvoice = useUpdateInvoice()

  const clients = clientsData?.data || []

  const handleUpdateInvoice = async (data: any) => {
    try {
      // Convert form data to UpdateInvoiceRequest format
      const updateData: UpdateInvoiceRequest = {
        client_id: data.client_id,
        amount_cents: Math.round(data.amount * 100), // Convert dollars to cents
        currency: data.currency,
        due_date: data.due_date,
        status: data.status,
      }

      await updateInvoice.mutateAsync({ id: invoiceId, data: updateData })
      // Redirect back to the invoice detail view
      navigate(`/app/invoices/${invoiceId}`)
    } catch (error) {
      // Error is handled by the mutation's onError callback
      console.error('Failed to update invoice:', error)
    }
  }

  if (invoiceLoading || clientsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="loading-shimmer h-10 w-10 rounded" />
          <div>
            <div className="loading-shimmer h-8 w-48 mb-2" />
            <div className="loading-shimmer h-4 w-64" />
          </div>
        </div>
        <div className="loading-shimmer h-96 w-full rounded-lg" />
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
          The invoice you're trying to edit doesn't exist.
        </p>
        <Button variant="ghost" onClick={() => navigate('/app/invoices')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoices
        </Button>
      </div>
    )
  }

  // Convert invoice data to form format
  const defaultValues = {
    client_id: invoice.client_id,
    amount: invoice.amount_cents / 100, // Convert cents to dollars
    currency: invoice.currency,
    due_date: invoice.due_date,
    status: invoice.status,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="glass-panel p-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/app/invoices/${invoiceId}`)}
          className="p-2 hover:bg-white/20 dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit Invoice #{invoice.id}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Update invoice details and status
          </p>
        </div>
      </section>


      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Invoice Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceForm
            clients={clients}
            onSubmit={handleUpdateInvoice}
            isLoading={updateInvoice.isPending}
            defaultValues={defaultValues}
            submitButtonText="Save Invoice"
            loadingButtonText="Saving..."
          />
        </CardContent>
      </Card>
    </div>
  )
}
