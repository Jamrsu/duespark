import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, MapPin, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useClient } from '@/api/hooks'
import { ClientInvoices } from '@/components/ClientInvoices'

export function ClientDetailView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const clientId = parseInt(id || '0')

  const { data: client, isLoading } = useClient(clientId)

  const handleSendEmail = () => {
    // For now, show an alert. In a real app, this would open an email composer
    // or integrate with an email service
    if (client) {
      const subject = encodeURIComponent(`Regarding your account - ${client.name}`)
      const body = encodeURIComponent(`Hello ${client.contact_name || 'there'},\n\nI hope this message finds you well.\n\nBest regards`)
      const mailtoUrl = `mailto:${client.email}?subject=${subject}&body=${body}`
      window.open(mailtoUrl, '_blank')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="loading-shimmer h-10 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="loading-shimmer h-6 w-32" />
                  <div className="loading-shimmer h-4 w-full" />
                  <div className="loading-shimmer h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <div className="loading-shimmer h-64 w-full" />
          </div>
        </div>
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
          The client you're looking for doesn't exist.
        </p>
        <Button variant="ghost" onClick={() => navigate('/app/clients')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clients
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="glass-panel p-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/clients')}
            className="p-2 hover:bg-white/20 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {client.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Client #{client.id}
            </p>
          </div>
        </div>
        <div className="flex sm:ml-auto">
          <Button size="sm" onClick={() => navigate(`/app/clients/${client.id}/edit`)} className="shadow-lg shadow-primary-500/30">
            Edit Client
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Email
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {client.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 text-gray-400 flex items-center justify-center">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Contact Person
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {client.contact_name || 'Not specified'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Phone Number
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {client.contact_phone || 'Not specified'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Timezone
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {client.timezone || 'UTC'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Invoices Section */}
          <ClientInvoices clientId={client.id} clientName={client.name} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleSendEmail}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => navigate(`/app/invoices/new?client_id=${client.id}`)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
