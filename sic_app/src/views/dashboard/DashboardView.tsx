import { useNavigate } from 'react-router-dom'
import { Plus, TrendingUp, AlertCircle, DollarSign, Send, Eye, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { KPICard, RevenueKPICard, InvoiceCountKPICard, OverdueKPICard } from '@/components/ui/KPICard'
import { useAnalyticsSummary, useInvoices } from '@/api/hooks'
import { formatCurrency } from '@/lib/utils'

export function DashboardView() {
  const navigate = useNavigate()
  const { data: analytics, isLoading: analyticsLoading } = useAnalyticsSummary()
  const { data: recentInvoicesData, isLoading: invoicesLoading } = useInvoices({ 
    limit: 5, 
    offset: 0 
  })

  const recentInvoices = recentInvoicesData?.data || []

  if (analyticsLoading) {
    return <DashboardSkeleton />
  }

  const totals = analytics?.totals || {
    all: 0,
    draft: 0,
    pending: 0,
    paid: 0,
    overdue: 0,
    cancelled: 0,
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <section className="glass-panel p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Overview of your invoice management
          </p>
        </div>
        <Button
          onClick={() => navigate('/app/invoices/new')}
          className="w-full sm:w-auto shadow-lg shadow-primary-500/30"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Invoice
        </Button>
      </section>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <InvoiceCountKPICard
          value={totals.all}
          onClick={() => navigate('/app/invoices')}
          showMobileActions={true}
          quickActions={[
            {
              label: "View All",
              icon: <Eye className="h-4 w-4" />,
              action: () => navigate('/app/invoices'),
              color: 'bg-blue-500 hover:bg-blue-600'
            },
            {
              label: "Create New",
              icon: <Plus className="h-4 w-4" />,
              action: () => navigate('/app/invoices/new'),
              color: 'bg-green-500 hover:bg-green-600'
            }
          ]}
        />

        <RevenueKPICard
          value={analytics?.expected_payments_next_30d || 0}
          onClick={() => navigate('/app/invoices?status=pending')}
          showMobileActions={true}
          quickActions={[
            {
              label: "View Pending",
              icon: <Clock className="h-4 w-4" />,
              action: () => navigate('/app/invoices?status=pending'),
              color: 'bg-yellow-500 hover:bg-yellow-600'
            }
          ]}
        />

        <OverdueKPICard
          value={totals.overdue}
          onClick={() => navigate('/app/invoices?status=overdue')}
          showMobileActions={true}
          quickActions={[
            {
              label: "Send Reminders",
              icon: <Send className="h-4 w-4" />,
              action: () => navigate('/app/reminders?bulk=overdue'),
              color: 'bg-red-500 hover:bg-red-600'
            },
            {
              label: "View Overdue",
              icon: <AlertCircle className="h-4 w-4" />,
              action: () => navigate('/app/invoices?status=overdue'),
              color: 'bg-orange-500 hover:bg-orange-600'
            }
          ]}
        />

        <KPICard
          title="Avg. Days to Pay"
          value={analytics?.avg_days_to_pay ? `${analytics.avg_days_to_pay.toFixed(1)} days` : 'N/A'}
          color="gray"
          icon={<TrendingUp className="h-6 w-6" />}
          showMobileActions={true}
          quickActions={[
            {
              label: "View Trends",
              icon: <TrendingUp className="h-4 w-4" />,
              action: () => navigate('/app/analytics'),
              color: 'bg-purple-500 hover:bg-purple-600'
            }
          ]}
        />
      </div>

      {/* Status Breakdown - Mobile-First Design */}
      <Card className="overflow-hidden h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg sm:text-xl">Invoice Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0 h-full flex flex-col justify-center min-h-[100px]">
          {/* Mobile: Horizontal Scrollable */}
          <div className="flex sm:hidden gap-4 px-4 pb-4 overflow-x-auto scrollbar-hide">
            {[
              { label: 'Draft', value: totals.draft, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800' },
              { label: 'Pending', value: totals.pending, color: 'text-warning-600', bg: 'bg-warning-50 dark:bg-warning-900/20' },
              { label: 'Paid', value: totals.paid, color: 'text-success-600', bg: 'bg-success-50 dark:bg-success-900/20' },
              { label: 'Overdue', value: totals.overdue, color: 'text-error-600', bg: 'bg-error-50 dark:bg-error-900/20' },
              { label: 'Cancelled', value: totals.cancelled, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex-shrink-0 w-24 text-center cursor-pointer rounded-lg p-3 transition-all duration-200 active:scale-95 min-h-[100px] flex flex-col justify-center ${item.bg}`}
                onClick={() => navigate(`/app/invoices?status=${item.label.toLowerCase()}`)}
              >
                <div className={`text-3xl font-bold ${item.color} dark:opacity-90`}>
                  {item.value}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 capitalize mt-1">
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Grid Layout */}
          <div className="hidden sm:grid grid-cols-3 lg:grid-cols-5 gap-1">
            {[
              { label: 'Draft', value: totals.draft, color: 'text-gray-600', bg: 'hover:bg-gray-50 dark:hover:bg-gray-800' },
              { label: 'Pending', value: totals.pending, color: 'text-warning-600', bg: 'hover:bg-warning-50 dark:hover:bg-warning-900/20' },
              { label: 'Paid', value: totals.paid, color: 'text-success-600', bg: 'hover:bg-success-50 dark:hover:bg-success-900/20' },
              { label: 'Overdue', value: totals.overdue, color: 'text-error-600', bg: 'hover:bg-error-50 dark:hover:bg-error-900/20' },
              { label: 'Cancelled', value: totals.cancelled, color: 'text-gray-500', bg: 'hover:bg-gray-50 dark:hover:bg-gray-800' },
            ].map((item) => (
              <div
                key={item.label}
                className={`text-center cursor-pointer rounded-lg p-4 transition-colors min-h-[100px] flex flex-col justify-center ${item.bg}`}
                onClick={() => navigate(`/app/invoices?status=${item.label.toLowerCase()}`)}
              >
                <div className={`text-3xl font-bold ${item.color} dark:opacity-90`}>
                  {item.value}
                </div>
                <div className="text-base text-gray-500 dark:text-gray-400 capitalize">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Invoices and Top Late Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app/invoices')}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="loading-shimmer h-16 rounded-lg" />
                ))}
              </div>
            ) : recentInvoices.length > 0 ? (
              <div className="space-y-3">
                {recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
                    onClick={() => navigate(`/app/invoices/${invoice.id}`)}
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        Invoice #{invoice.id}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Due: {new Date(invoice.due_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(invoice.amount_cents, invoice.currency)}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                        invoice.status === 'paid' 
                          ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300'
                          : invoice.status === 'overdue'
                          ? 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300'
                          : 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300'
                      }`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <DollarSign className="h-12 w-12 mx-auto mb-3" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">No invoices yet</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/app/invoices/new')}
                  className="mt-2"
                >
                  Create your first invoice
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Late Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning-600" />
              Top Late Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.top_late_clients && analytics.top_late_clients.length > 0 ? (
              <div className="space-y-3">
                {analytics.top_late_clients.slice(0, 5).map((client) => (
                  <div
                    key={client.client_id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
                    onClick={() => navigate(`/app/clients/${client.client_id}`)}
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {client.client_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {client.overdue_count} overdue invoice{client.overdue_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-error-600 dark:text-error-400 font-medium">
                        {client.avg_days_late.toFixed(0)} days late
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrency(client.total_overdue_amount_cents)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">No late clients</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  All invoices are being paid on time! 🎉
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Loading skeleton
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="loading-shimmer h-8 w-32 mb-2" />
          <div className="loading-shimmer h-4 w-48" />
        </div>
        <div className="loading-shimmer h-10 w-32" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="loading-shimmer h-4 w-20 mb-2" />
            <div className="loading-shimmer h-8 w-16 mb-1" />
            <div className="loading-shimmer h-3 w-24" />
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="loading-shimmer h-6 w-40 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="text-center">
              <div className="loading-shimmer h-8 w-12 mx-auto mb-2" />
              <div className="loading-shimmer h-4 w-16 mx-auto" />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="loading-shimmer h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="loading-shimmer h-16" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
