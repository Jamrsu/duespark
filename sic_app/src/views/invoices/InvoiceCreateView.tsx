import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { InvoiceForm } from '@/components/forms/InvoiceForm'
import { useClients, useCreateInvoice } from '@/api/hooks'
import { CreateInvoiceRequest } from '@/types/api'

export function InvoiceCreateView() {
  const navigate = useNavigate()
  const { data: clientsData, isLoading: clientsLoading } = useClients({ limit: 100, offset: 0 })
  const createInvoice = useCreateInvoice()

  const clients = clientsData?.data || []

  const handleCreateInvoice = async (data: CreateInvoiceRequest) => {
    try {
      const invoice = await createInvoice.mutateAsync(data)
      // Redirect to the newly created invoice
      navigate(`/invoices/${invoice.id}`)
    } catch (error) {
      // Error is handled by the mutation's onError callback
      console.error('Failed to create invoice:', error)
    }
  }

  if (clientsLoading) {
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

  // Show message if no clients exist
  if (clients.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/invoices')}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create New Invoice
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Create a new invoice for your client
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="text-center py-12">
            <div className="text-warning-400 mb-4">
              <CheckCircle className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Clients Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              You need to create at least one client before you can create an invoice.
            </p>
            <div className="space-y-3">
              <Button onClick={() => navigate('/clients/new')}>
                Create Your First Client
              </Button>
              <br />
              <Button variant="ghost" onClick={() => navigate('/clients')}>
                View Clients
              </Button>
            </div>
          </CardContent>
        </Card>
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
          aria-label="Back to invoices"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create New Invoice
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create a new invoice for your client
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <InvoiceForm
            clients={clients}
            onSubmit={handleCreateInvoice}
            isLoading={createInvoice.isPending}
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => navigate('/clients/new')}
                >
                  Add New Client
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => navigate('/clients')}
                >
                  Manage Clients
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => navigate('/invoices')}
                >
                  View All Invoices
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => navigate('/dashboard')}
                >
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
            <CardHeader>
              <CardTitle className="text-primary-700 dark:text-primary-300">
                Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2 text-primary-600 dark:text-primary-400">
                <p>• Set due dates 30 days from today for best results</p>
                <p>• Use "Draft" status if you need to review before sending</p>
                <p>• All amounts are processed securely</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}