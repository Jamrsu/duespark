'use client';

import { useQuery } from '@tanstack/react-query';
import AuthGuard from '@/components/AuthGuard';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import apiService from '@/lib/api';
import { FileText, Users, DollarSign, AlertCircle, Plus, Settings } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => apiService.getInvoices(),
  });

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiService.getClients(),
  });

  const totalInvoices = invoices?.length || 0;
  const totalClients = clients?.length || 0;
  const totalAmount = invoices?.reduce((sum, invoice) => sum + invoice.amount, 0) || 0;
  const overdueInvoices = invoices?.filter(
    invoice =>
      invoice.status === 'overdue' ||
      (invoice.status === 'sent' && new Date(invoice.due_date) < new Date())
  ) || [];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navigation />

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600">Welcome back! Here&apos;s an overview of your business.</p>
              </div>
              <div className="flex space-x-3">
                <Link href="/clients/new">
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Client
                  </Button>
                </Link>
                <Link href="/invoices/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invoice
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalInvoices}</div>
                  <p className="text-xs text-muted-foreground">
                    {invoicesLoading ? 'Loading...' : 'All time'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalClients}</div>
                  <p className="text-xs text-muted-foreground">
                    {clientsLoading ? 'Loading...' : 'Active clients'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalAmount.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    All invoices
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{overdueInvoices.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Need attention
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Invoices</CardTitle>
                  <CardDescription>
                    Your latest invoices and their status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {invoicesLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      ))}
                    </div>
                  ) : invoices && invoices.length > 0 ? (
                    <div className="space-y-4">
                      {invoices.slice(0, 5).map((invoice) => (
                        <div key={invoice.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">#{invoice.invoice_number}</p>
                            <p className="text-sm text-gray-600">
                              {invoice.client?.name || 'Unknown Client'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${invoice.amount.toLocaleString()}</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              invoice.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : invoice.status === 'overdue'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {invoice.status}
                            </span>
                          </div>
                        </div>
                      ))}
                      <Link href="/invoices">
                        <Button variant="outline" className="w-full mt-4">
                          View All Invoices
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by creating your first invoice.
                      </p>
                      <div className="mt-6">
                        <Link href="/invoices/new">
                          <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Invoice
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Common tasks to manage your business
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Link href="/invoices/new" className="block">
                      <Button variant="outline" className="w-full justify-start">
                        <FileText className="w-4 h-4 mr-2" />
                        Create New Invoice
                      </Button>
                    </Link>
                    <Link href="/clients/new" className="block">
                      <Button variant="outline" className="w-full justify-start">
                        <Users className="w-4 h-4 mr-2" />
                        Add New Client
                      </Button>
                    </Link>
                    <Link href="/reminders" className="block">
                      <Button variant="outline" className="w-full justify-start">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Manage Reminders
                      </Button>
                    </Link>
                    <Link href="/settings" className="block">
                      <Button variant="outline" className="w-full justify-start">
                        <Settings className="w-4 h-4 mr-2" />
                        Account Settings
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}