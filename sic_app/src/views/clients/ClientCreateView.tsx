import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ClientForm } from '@/components/forms/ClientForm'
import { useCreateClient } from '@/api/hooks'
import { CreateClientRequest } from '@/types/api'

export function ClientCreateView() {
  const navigate = useNavigate()
  const createClient = useCreateClient()

  const handleCreateClient = async (data: CreateClientRequest) => {
    try {
      const client = await createClient.mutateAsync(data)
      // Redirect to the newly created client
      navigate(`/clients/${client.id}`)
    } catch (error) {
      // Error is handled by the mutation's onError callback
      console.error('Failed to create client:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/clients')}
          className="p-2"
          aria-label="Back to clients"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Add New Client
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create a new client for your business
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ClientForm
            onSubmit={handleCreateClient}
            isLoading={createClient.isPending}
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
                  onClick={() => navigate('/invoices/new')}
                >
                  Create Invoice
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => navigate('/clients')}
                >
                  View All Clients
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
                <p>• Use the client's business email for best results</p>
                <p>• Setting timezone helps with reminder scheduling</p>
                <p>• All client information can be updated later</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}