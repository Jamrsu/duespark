import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ClientForm } from '@/components/forms/ClientForm'
import { useClient, useUpdateClient } from '@/api/hooks'
import { CreateClientRequest } from '@/types/api'

export function ClientEditView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const clientId = parseInt(id || '0')
  
  const { data: client, isLoading: clientLoading } = useClient(clientId)
  const updateClient = useUpdateClient()

  const handleUpdateClient = async (data: CreateClientRequest) => {
    try {
      await updateClient.mutateAsync({ id: clientId, data })
      // Redirect back to the client detail view
      navigate(`/app/clients/${clientId}`)
    } catch (error) {
      // Error is handled by the mutation's onError callback
      console.error('Failed to update client:', error)
    }
  }

  if (clientLoading) {
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

  if (!client) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
          Client not found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          The client you're trying to edit doesn't exist.
        </p>
        <Button
          variant="ghost"
          onClick={() => navigate('/app/clients')}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Back to Clients
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
          onClick={() => navigate(`/app/clients/${clientId}`)}
          className="p-2 hover:bg-white/20 dark:hover:bg-white/10"
          aria-label="Back to client details"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit {client.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Update client information
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ClientForm
            onSubmit={handleUpdateClient}
            isLoading={updateClient.isPending}
            isEditing={true}
            defaultValues={{
              name: client.name,
              email: client.email,
              contact_name: client.contact_name || undefined,
              contact_phone: client.contact_phone || undefined,
              timezone: client.timezone || undefined
            }}
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
                  className="w-full justify-start text-left"
                  onClick={() => navigate(`/app/invoices/new?client_id=${clientId}`)}
                >
                  <span className="text-left">Create Invoice</span>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left"
                  onClick={() => navigate(`/app/invoices?client_id=${clientId}`)}
                >
                  <span className="text-left">View Invoices</span>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left"
                  onClick={() => navigate(`/app/clients/${clientId}`)}
                >
                  <span className="text-left">View Client Details</span>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left"
                  onClick={() => navigate('/app/clients')}
                >
                  <span className="text-left">Back to All Clients</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800">
            <CardHeader>
              <CardTitle className="text-warning-700 dark:text-warning-300">
                Important Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2 text-warning-600 dark:text-warning-400">
                <p>• Changes will affect all future communications</p>
                <p>• Email changes may require re-verification</p>
                <p>• Existing invoices won't be modified</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
