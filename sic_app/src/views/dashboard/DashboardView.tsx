import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, TrendingUp, AlertCircle, DollarSign, Clock, FileText, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { KPICard, RevenueKPICard } from '@/components/ui/KPICard'
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
    return (
      <div className="space-y-4">
        <div className="loading-shimmer h-8 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="loading-shimmer h-24 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="loading-shimmer h-32 rounded-lg" />
          ))}
        </div>
        <div className="loading-shimmer h-64 rounded-lg" />
      </div>
    )
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
    <div className="space-y-4">
      {/* Header */}
      <section className="px-6 pt-2 pb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Overview of your invoice management
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            className="w-full sm:w-auto shadow-lg shadow-primary-500/30"
            onClick={() => navigate('/app/invoices/new')}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            New Invoice
          </Button>
        </div>
      </section>

      {/* Invoice Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              className="text-center p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              onClick={() => navigate('/app/invoices')}
            >
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {totals.all}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total
              </div>
            </div>
            <div
              className="text-center p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              onClick={() => navigate('/app/invoices?status=pending')}
            >
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                {totals.pending}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Pending
              </div>
            </div>
            <div
              className="text-center p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              onClick={() => navigate('/app/invoices?status=paid')}
            >
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                {totals.paid}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Paid
              </div>
            </div>
            <div
              className="text-center p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              onClick={() => navigate('/app/invoices?status=overdue')}
            >
              <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">
                {totals.overdue}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Overdue
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RevenueKPICard
          earnedRevenue={0}
          outstandingRevenue={analytics?.expected_payments_next_30d || 0}
          onClick={() => navigate('/app/invoices?status=pending')}
        />
        <KPICard
          title="Avg. Days to Pay"
          value={analytics?.avg_days_to_pay ?
            analytics.avg_days_to_pay < 0
              ? (
                <>
                  {Math.round(Math.abs(analytics.avg_days_to_pay))} <span className="text-sm font-normal">days early</span>
                </>
              )
              : `${Math.round(analytics.avg_days_to_pay)} days`
            : '0'}
          subtitle={analytics?.avg_days_to_pay ? undefined : 'No paid invoices yet'}
          color="gray"
          icon={<TrendingUp className="h-6 w-6" />}
        />
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Invoices
            {recentInvoices.length > 0 && (
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                ({recentInvoices.length})
              </span>
            )}
          </CardTitle>
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
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                  onClick={() => navigate(`/app/invoices/${invoice.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      Invoice #{invoice.id}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Due: {new Date(invoice.due_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right ml-4">
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
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/app/invoices')}
                  className="w-full"
                >
                  View All Invoices
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <FileText className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-4">No invoices yet</p>
              <Button
                onClick={() => navigate('/app/invoices/new')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create your first invoice
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Late Clients */}
      {analytics?.top_late_clients && analytics.top_late_clients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning-600" />
              Top Late Clients
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                ({analytics.top_late_clients.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.top_late_clients.slice(0, 5).map((client) => (
                <div
                  key={client.client_id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                  onClick={() => navigate(`/app/clients/${client.client_id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {client.client_name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {client.overdue_count} overdue invoice{client.overdue_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-error-600 dark:text-error-400 font-medium">
                      {client.avg_days_late.toFixed(0)} days late
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatCurrency(client.total_overdue_amount_cents)}
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/app/clients')}
                  className="w-full"
                >
                  View All Clients
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
