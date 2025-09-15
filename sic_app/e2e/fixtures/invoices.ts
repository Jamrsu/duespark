/**
 * Test fixtures for invoice data
 */

export interface TestInvoice {
  id?: number
  client_id?: number
  owner_id?: number
  invoice_number: string
  amount: number
  due_date: string
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled'
  description?: string
  stripe_invoice_id?: string
  created_at?: string
  updated_at?: string
}

export interface TestClient {
  id?: number
  name: string
  email: string
  company?: string
  phone?: string
  address?: string
  owner_id?: number
  created_at?: string
  updated_at?: string
}

export const testClients: Record<string, TestClient> = {
  acmeCorp: {
    name: 'John Smith',
    email: 'john@acmecorp.com',
    company: 'Acme Corporation',
    phone: '+1-555-0123',
    address: '123 Business St, New York, NY 10001'
  },

  techStartup: {
    name: 'Sarah Johnson',
    email: 'sarah@techstartup.com',
    company: 'Tech Startup Inc',
    phone: '+1-555-0456',
    address: '456 Silicon Valley, CA 94000'
  },

  freelancer: {
    name: 'Mike Wilson',
    email: 'mike@freelancer.com',
    company: null,
    phone: '+1-555-0789',
    address: '789 Remote St, Austin, TX 73301'
  }
}

export const testInvoices: Record<string, TestInvoice> = {
  pending: {
    invoice_number: 'INV-001',
    amount: 1500.00,
    due_date: '2024-02-15',
    status: 'pending',
    description: 'Web development services - Q4 2023',
    client_id: 1
  },

  overdue: {
    invoice_number: 'INV-002',
    amount: 2500.00,
    due_date: '2023-12-15', // Past date
    status: 'overdue',
    description: 'Mobile app development',
    client_id: 2
  },

  draft: {
    invoice_number: 'INV-003',
    amount: 750.00,
    due_date: '2024-03-01',
    status: 'draft',
    description: 'Logo design services',
    client_id: 1
  },

  paid: {
    invoice_number: 'INV-004',
    amount: 3000.00,
    due_date: '2024-01-15',
    status: 'paid',
    description: 'Full-stack development project',
    client_id: 2,
    stripe_invoice_id: 'in_test123'
  }
}

// Sample import data that would come from Stripe
export const stripeInvoiceImportData = [
  {
    id: 'in_test001',
    customer: {
      id: 'cus_test001',
      name: 'Acme Corporation',
      email: 'billing@acmecorp.com'
    },
    amount_due: 150000, // Stripe amounts are in cents
    due_date: 1708041600, // Unix timestamp
    status: 'open',
    description: 'Monthly subscription - January 2024',
    invoice_pdf: 'https://pay.stripe.com/invoice/test_pdf',
    hosted_invoice_url: 'https://pay.stripe.com/invoice/test_hosted'
  },
  {
    id: 'in_test002',
    customer: {
      id: 'cus_test002',
      name: 'Tech Startup Inc',
      email: 'accounts@techstartup.com'
    },
    amount_due: 250000,
    due_date: 1705363200,
    status: 'open',
    description: 'Consulting services - Q4 2023',
    invoice_pdf: 'https://pay.stripe.com/invoice/test_pdf2',
    hosted_invoice_url: 'https://pay.stripe.com/invoice/test_hosted2'
  }
]