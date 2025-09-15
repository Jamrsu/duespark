/**
 * API mocking utilities for E2E tests
 */

import { Page, Route } from '@playwright/test'
import { testUsers, mockJwtToken, mockEmailVerificationToken } from '../fixtures/users'
import { testClients, testInvoices, stripeInvoiceImportData } from '../fixtures/invoices'
import { testReminders, testEmailTemplates, mockEmailWebhooks, testAnalytics } from '../fixtures/reminders'

export interface MockApiOptions {
  baseURL?: string
  delayMs?: number
}

export class ApiMocker {
  private page: Page
  private baseURL: string
  private delayMs: number

  constructor(page: Page, options: MockApiOptions = {}) {
    this.page = page
    this.baseURL = options.baseURL || 'http://localhost:8000'
    this.delayMs = options.delayMs || 100
  }

  private async mockResponse(route: Route, data: any, status = 200) {
    await new Promise(resolve => setTimeout(resolve, this.delayMs))
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(data)
    })
  }

  async mockAuthEndpoints() {
    // User registration
    await this.page.route(`${this.baseURL}/auth/register`, async (route) => {
      const request = route.request()
      const postData = request.postDataJSON()

      if (postData.email === 'existing@test.com') {
        await this.mockResponse(route, { detail: 'User already exists' }, 400)
      } else {
        const newUser = {
          ...testUsers.newUser,
          id: 1,
          email: postData.email,
          created_at: new Date().toISOString()
        }
        await this.mockResponse(route, {
          user: newUser,
          message: 'User created successfully. Please check your email for verification.'
        })
      }
    })

    // User login
    await this.page.route(`${this.baseURL}/auth/login`, async (route) => {
      const request = route.request()
      const formData = await request.postData()

      // Parse form data
      const params = new URLSearchParams(formData || '')
      const email = params.get('username') || params.get('email')
      const password = params.get('password')

      if (email === 'verified@test.com' && password === 'TestPassword123!') {
        await this.mockResponse(route, {
          access_token: mockJwtToken,
          token_type: 'bearer',
          user: testUsers.verifiedUser
        })
      } else {
        await this.mockResponse(route, { detail: 'Invalid credentials' }, 401)
      }
    })

    // Email verification
    await this.page.route(`${this.baseURL}/auth/verify-email/${mockEmailVerificationToken}`, async (route) => {
      await this.mockResponse(route, {
        message: 'Email verified successfully',
        user: {
          ...testUsers.verifiedUser,
          email_verified: true,
          onboarding_status: 'email_verified'
        }
      })
    })

    // Get current user
    await this.page.route(`${this.baseURL}/auth/me`, async (route) => {
      const auth = route.request().headers()['authorization']
      if (auth && auth.includes(mockJwtToken)) {
        await this.mockResponse(route, testUsers.completeUser)
      } else {
        await this.mockResponse(route, { detail: 'Not authenticated' }, 401)
      }
    })
  }

  async mockStripeEndpoints() {
    // Stripe OAuth callback
    await this.page.route(`${this.baseURL}/integrations/stripe/callback*`, async (route) => {
      const url = new URL(route.request().url())
      const code = url.searchParams.get('code')

      if (code === 'test_oauth_code') {
        await this.mockResponse(route, {
          stripe_account_id: 'acct_test123',
          message: 'Stripe account connected successfully'
        })
      } else {
        await this.mockResponse(route, { detail: 'Invalid OAuth code' }, 400)
      }
    })

    // Import invoices from Stripe
    await this.page.route(`${this.baseURL}/integrations/stripe/import-invoices`, async (route) => {
      await this.mockResponse(route, {
        imported_count: stripeInvoiceImportData.length,
        invoices: stripeInvoiceImportData.map((invoice, index) => ({
          id: index + 1,
          invoice_number: `STRIPE-${String(index + 1).padStart(3, '0')}`,
          amount: invoice.amount_due / 100,
          due_date: new Date(invoice.due_date * 1000).toISOString().split('T')[0],
          status: invoice.status === 'open' ? 'pending' : 'paid',
          description: invoice.description,
          stripe_invoice_id: invoice.id,
          client_id: index + 1
        }))
      })
    })

    // Stripe webhook endpoint
    await this.page.route(`${this.baseURL}/webhooks/stripe`, async (route) => {
      await this.mockResponse(route, { received: true })
    })
  }

  async mockInvoiceEndpoints() {
    // Get invoices
    await this.page.route(`${this.baseURL}/invoices*`, async (route) => {
      const invoices = Object.values(testInvoices).map((invoice, index) => ({
        ...invoice,
        id: index + 1,
        owner_id: 1
      }))
      await this.mockResponse(route, invoices)
    })

    // Create invoice
    await this.page.route(`${this.baseURL}/invoices`, async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON()
        const newInvoice = {
          ...postData,
          id: Date.now(),
          owner_id: 1,
          status: 'draft',
          created_at: new Date().toISOString()
        }
        await this.mockResponse(route, newInvoice)
      }
    })

    // Update invoice status (payment received)
    await this.page.route(`${this.baseURL}/invoices/*/status`, async (route) => {
      const postData = route.request().postDataJSON()
      await this.mockResponse(route, {
        message: 'Invoice status updated',
        status: postData.status
      })
    })
  }

  async mockClientEndpoints() {
    // Get clients
    await this.page.route(`${this.baseURL}/clients*`, async (route) => {
      const clients = Object.values(testClients).map((client, index) => ({
        ...client,
        id: index + 1,
        owner_id: 1
      }))
      await this.mockResponse(route, clients)
    })

    // Create client
    await this.page.route(`${this.baseURL}/clients`, async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON()
        const newClient = {
          ...postData,
          id: Date.now(),
          owner_id: 1,
          created_at: new Date().toISOString()
        }
        await this.mockResponse(route, newClient)
      }
    })
  }

  async mockReminderEndpoints() {
    // Get reminders
    await this.page.route(`${this.baseURL}/reminders*`, async (route) => {
      const reminders = Object.values(testReminders).map((reminder, index) => ({
        ...reminder,
        id: index + 1,
        user_id: 1
      }))
      await this.mockResponse(route, reminders)
    })

    // Create reminder
    await this.page.route(`${this.baseURL}/reminders`, async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON()
        const newReminder = {
          ...postData,
          id: Date.now(),
          user_id: 1,
          status: 'scheduled',
          created_at: new Date().toISOString()
        }
        await this.mockResponse(route, newReminder)
      }
    })

    // Get email templates
    await this.page.route(`${this.baseURL}/email-templates*`, async (route) => {
      await this.mockResponse(route, Object.values(testEmailTemplates))
    })

    // Preview email
    await this.page.route(`${this.baseURL}/reminders/*/preview`, async (route) => {
      const template = testEmailTemplates.paymentReminder
      await this.mockResponse(route, {
        subject: 'Payment Reminder for Invoice INV-001',
        body: `Dear John Smith,

This is a friendly reminder that your invoice #INV-001 for $1500.00 is due on 2024-02-15.

Please make your payment at your earliest convenience.

Best regards,
Test User`,
        template_id: template.id
      })
    })

    // Send reminder
    await this.page.route(`${this.baseURL}/reminders/*/send`, async (route) => {
      await this.mockResponse(route, {
        message: 'Reminder sent successfully',
        message_id: 'msg_test123',
        sent_at: new Date().toISOString()
      })
    })
  }

  async mockAnalyticsEndpoints() {
    // Dashboard analytics
    await this.page.route(`${this.baseURL}/analytics/dashboard*`, async (route) => {
      await this.mockResponse(route, testAnalytics)
    })

    // Email analytics
    await this.page.route(`${this.baseURL}/analytics/emails*`, async (route) => {
      await this.mockResponse(route, {
        sent: 12,
        delivered: 11,
        opened: 9,
        clicked: 4,
        bounced: 1,
        open_rate: 0.75,
        click_rate: 0.36
      })
    })
  }

  async mockEmailWebhookEndpoints() {
    // Email webhook endpoint
    await this.page.route(`${this.baseURL}/webhooks/email*`, async (route) => {
      await this.mockResponse(route, { received: true })
    })
  }

  async mockAllEndpoints() {
    await this.mockAuthEndpoints()
    await this.mockStripeEndpoints()
    await this.mockInvoiceEndpoints()
    await this.mockClientEndpoints()
    await this.mockReminderEndpoints()
    await this.mockAnalyticsEndpoints()
    await this.mockEmailWebhookEndpoints()
  }
}