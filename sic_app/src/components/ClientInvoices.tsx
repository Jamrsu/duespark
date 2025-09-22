import { useNavigate } from 'react-router-dom'
import { Plus, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useInvoices } from '@/api/hooks'
import { formatCurrency, formatDate } from '@/lib/utils'

interface ClientInvoicesProps {
  clientId: number
  clientName: string
}

export function ClientInvoices({ clientId, clientName }: ClientInvoicesProps) {
  const navigate = useNavigate()

  const { data: invoicesData, isLoading } = useInvoices({
    client_id: clientId,
    limit: 10, // Show up to 10 recent invoices
    offset: 0
  })

  const invoices = invoicesData?.data || []

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Client Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="loading-shimmer h-16 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Client Invoices ({invoices.length})
          </CardTitle>
          <Button
            size="sm"
            onClick={() => navigate(`/app/invoices/new?client_id=${clientId}`)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            New Invoice
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {invoices.length > 0 ? (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors border border-gray-200 dark:border-gray-700"
                onClick={() => navigate(`/app/invoices/${invoice.id}`)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      Invoice #{invoice.id}
                    </h4>
                    <StatusBadge status={invoice.status} />
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Due: {formatDate(invoice.due_date)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(invoice.amount_cents, invoice.currency)}
                  </div>
                  {invoice.paid_at && (
                    <div className="text-xs text-success-600 dark:text-success-400">
                      Paid {formatDate(invoice.paid_at)}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* View All Button */}
            {invoices.length >= 10 && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/app/invoices?client_id=${clientId}`)}
                  className="w-full"
                >
                  View All {clientName} Invoices
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <FileText className="h-12 w-12 mx-auto" />
            </div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Invoices Yet
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Create your first invoice for {clientName}
            </p>
            <Button
              size="sm"
              onClick={() => navigate(`/app/invoices/new?client_id=${clientId}`)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Create First Invoice
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}