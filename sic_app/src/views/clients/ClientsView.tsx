import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, ArrowUpDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useClients } from '@/api/hooks'

type SortField = 'name' | 'email' | 'created_at'
type SortOrder = 'asc' | 'desc'

export function ClientsView() {
  const navigate = useNavigate()
  const { data: clientsData, isLoading } = useClients({ limit: 100, offset: 0 })
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  
  const rawClients = clientsData?.data || []
  
  const clients = useMemo(() => {
    return [...rawClients].sort((a, b) => {
      let aValue: string | number
      let bValue: string | number
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'email':
          aValue = a.email.toLowerCase()
          bValue = b.email.toLowerCase()
          break
        case 'created_at':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [rawClients, sortField, sortOrder])
  
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }
  
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />
    }
    return sortOrder === 'asc' 
      ? '↑'
      : '↓'
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="loading-shimmer h-8 w-32" />
          <div className="loading-shimmer h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="loading-shimmer h-16 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Clients
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your client relationships
          </p>
        </div>
        <Button 
          className="w-full sm:w-auto"
          onClick={() => navigate('/clients/new')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Clients ({clients.length})</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('name')}
                  className={`h-8 px-2 ${sortField === 'name' ? 'bg-primary-100 dark:bg-primary-900/30' : ''}`}
                  data-testid="sort-name"
                >
                  Name {getSortIcon('name')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('email')}
                  className={`h-8 px-2 ${sortField === 'email' ? 'bg-primary-100 dark:bg-primary-900/30' : ''}`}
                  data-testid="sort-email"
                >
                  Email {getSortIcon('email')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('created_at')}
                  className={`h-8 px-2 ${sortField === 'created_at' ? 'bg-primary-100 dark:bg-primary-900/30' : ''}`}
                  data-testid="sort-created"
                >
                  Created {getSortIcon('created_at')}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {clients.length > 0 ? (
            <div className="space-y-2">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                  onClick={() => navigate(`/clients/${client.id}`)}
                  data-testid="client-card"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate" data-testid="client-name">
                            {client.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate" data-testid="client-email">
                            {client.email}
                          </p>
                          {client.contact_name && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate" data-testid="contact-name">
                              Contact: {client.contact_name}
                            </p>
                          )}
                        </div>
                        <div className="hidden sm:flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                          {client.contact_phone && (
                            <div className="text-center">
                              <div className="font-medium" data-testid="contact-phone">{client.contact_phone}</div>
                              <div className="text-xs">Phone</div>
                            </div>
                          )}
                          <div className="text-center">
                            <div className="font-medium">{client.timezone || 'UTC'}</div>
                            <div className="text-xs">Timezone</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{formatDate(client.created_at)}</div>
                            <div className="text-xs">Created</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="sm:hidden text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(client.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Users className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No clients yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Add your first client to start managing invoices.
              </p>
              <Button onClick={() => navigate('/clients/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}