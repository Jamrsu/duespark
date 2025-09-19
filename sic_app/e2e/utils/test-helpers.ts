/**
 * Common test helper functions for E2E tests
 */

import { Page, expect, Locator } from '@playwright/test'
import { TestUser, TestRegistration, mockJwtToken } from '../fixtures/users'

export class TestHelpers {
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Register a new user
   */
  async registerUser(registration: TestRegistration) {
    await this.page.goto('/auth/register')

    await this.page.fill('input#email', registration.email)
    await this.page.fill('input#password', registration.password)
    await this.page.fill('input#confirmPassword', registration.confirmPassword)

    await this.page.click('button[type="submit"]')
  }

  /**
   * Login with user credentials
   */
  async loginUser(email: string, password: string) {
    await this.page.goto('/auth/login')

    await this.page.fill('input#email', email)
    await this.page.fill('input#password', password)

    await this.page.click('button[type="submit"]')

    // Wait for redirect
    await this.page.waitForURL('/dashboard')
  }

  /**
   * Set authentication token directly (bypass login)
   */
  async setAuthToken(token = mockJwtToken, user?: TestUser) {
    await this.page.addInitScript((tokenData) => {
      localStorage.setItem('token', tokenData.token)
      if (tokenData.user) {
        localStorage.setItem('user', JSON.stringify(tokenData.user))
      }
    }, { token, user })
  }

  /**
   * Wait for email verification link and click it
   */
  async verifyEmail(token: string) {
    const verificationUrl = `/auth/verify-email/${token}`
    await this.page.goto(verificationUrl)

    await expect(this.page.locator('text=Email verified')).toBeVisible()
  }

  /**
   * Navigate through Stripe OAuth flow (mocked)
   */
  async connectStripeAccount() {
    // Click connect Stripe button
    await this.page.click('button:has-text("Connect Stripe")')

    // Should open new tab/popup, but we'll mock this
    await this.page.route('https://connect.stripe.com/oauth/authorize*', async (route) => {
      const params = new URLSearchParams(route.request().url().split('?')[1])
      const redirectUri = params.get('redirect_uri')

      // Redirect back with mock code
      await route.fulfill({
        status: 302,
        headers: {
          'Location': `${redirectUri}?code=test_oauth_code&state=${params.get('state')}`
        }
      })
    })

    // Wait for connection success
    await expect(this.page.locator('text=Stripe account connected')).toBeVisible()
  }

  /**
   * Import sample invoices from Stripe
   */
  async importStripeInvoices() {
    await this.page.click('button:has-text("Import Invoices")')

    // Wait for import confirmation
    await expect(this.page.locator('text=invoices imported')).toBeVisible()
  }

  /**
   * Create a new client
   */
  async createClient(client: {
    name: string
    email: string
    company?: string
    phone?: string
  }) {
    await this.page.goto('/clients')
    await this.page.click('button:has-text("Add Client")')

    await this.page.fill('input[name="name"]', client.name)
    await this.page.fill('input[name="email"]', client.email)

    if (client.company) {
      await this.page.fill('input[name="company"]', client.company)
    }

    if (client.phone) {
      await this.page.fill('input[name="phone"]', client.phone)
    }

    await this.page.click('button[type="submit"]')

    // Wait for success message
    await expect(this.page.locator('text=Client created')).toBeVisible()
  }

  /**
   * Create a new invoice
   */
  async createInvoice(invoice: {
    clientName?: string
    amount: number
    dueDate: string
    description?: string
  }) {
    await this.page.goto('/invoices')
    await this.page.click('button:has-text("New Invoice")')

    // Select client if specified
    if (invoice.clientName) {
      await this.page.click('select[name="client_id"]')
      await this.page.click(`option:has-text("${invoice.clientName}")`)
    }

    await this.page.fill('input[name="amount"]', invoice.amount.toString())
    await this.page.fill('input[name="due_date"]', invoice.dueDate)

    if (invoice.description) {
      await this.page.fill('textarea[name="description"]', invoice.description)
    }

    await this.page.click('button[type="submit"]')

    // Wait for success message
    await expect(this.page.locator('text=Invoice created')).toBeVisible()
  }

  /**
   * Create a payment reminder
   */
  async createReminder(reminder: {
    invoiceNumber?: string
    scheduledDate: string
    template?: string
    customMessage?: string
  }) {
    await this.page.goto('/reminders')
    await this.page.click('button:has-text("New Reminder")')

    // Select invoice
    if (reminder.invoiceNumber) {
      await this.page.click('select[name="invoice_id"]')
      await this.page.click(`option:has-text("${reminder.invoiceNumber}")`)
    }

    // Set scheduled date
    await this.page.fill('input[name="scheduled_date"]', reminder.scheduledDate)

    // Select template
    if (reminder.template) {
      await this.page.click('select[name="template"]')
      await this.page.click(`option:has-text("${reminder.template}")`)
    }

    // Add custom message
    if (reminder.customMessage) {
      await this.page.fill('textarea[name="custom_message"]', reminder.customMessage)
    }

    await this.page.click('button[type="submit"]')

    // Wait for success message
    await expect(this.page.locator('text=Reminder created')).toBeVisible()
  }

  /**
   * Preview email before sending
   */
  async previewEmail(reminderId?: string) {
    if (reminderId) {
      await this.page.goto(`/reminders/${reminderId}`)
    }

    await this.page.click('button:has-text("Preview")')

    // Wait for preview modal
    await expect(this.page.locator('[role="dialog"]')).toBeVisible()

    return {
      subject: await this.page.locator('[data-testid="email-subject"]').textContent(),
      body: await this.page.locator('[data-testid="email-body"]').textContent()
    }
  }

  /**
   * Send a reminder
   */
  async sendReminder(reminderId?: string) {
    if (reminderId) {
      await this.page.goto(`/reminders/${reminderId}`)
    }

    await this.page.click('button:has-text("Send Now")')

    // Confirm sending
    await this.page.click('button:has-text("Confirm")')

    // Wait for success message
    await expect(this.page.locator('text=Reminder sent')).toBeVisible()
  }

  /**
   * Mark invoice as paid
   */
  async markInvoicePaid(invoiceNumber: string) {
    await this.page.goto('/invoices')

    // Find invoice row
    const invoiceRow = this.page.locator(`tr:has-text("${invoiceNumber}")`)

    // Click status dropdown
    await invoiceRow.locator('select[name="status"]').selectOption('paid')

    // Wait for update confirmation
    await expect(this.page.locator('text=Invoice updated')).toBeVisible()
  }

  /**
   * Simulate webhook received
   */
  async simulateWebhook(webhookData: any, endpoint = '/api/webhooks/email') {
    await this.page.evaluate(async (data) => {
      await fetch(data.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data.payload)
      })
    }, { endpoint, payload: webhookData })
  }

  /**
   * Check analytics data
   */
  async getAnalyticsData() {
    await this.page.goto('/analytics')

    return {
      totalRevenue: await this.page.locator('[data-testid="total-revenue"]').textContent(),
      pendingInvoices: await this.page.locator('[data-testid="pending-invoices"]').textContent(),
      overdueInvoices: await this.page.locator('[data-testid="overdue-invoices"]').textContent(),
      paidInvoices: await this.page.locator('[data-testid="paid-invoices"]').textContent(),
      remindersSent: await this.page.locator('[data-testid="reminders-sent"]').textContent(),
      emailOpenRate: await this.page.locator('[data-testid="email-open-rate"]').textContent()
    }
  }

  /**
   * Wait for element with timeout
   */
  async waitForElement(selector: string, timeout = 5000) {
    return this.page.waitForSelector(selector, { timeout })
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(name: string) {
    return this.page.screenshot({
      path: `e2e/screenshots/${name}.png`,
      fullPage: true
    })
  }

  /**
   * Fill form and submit
   */
  async fillAndSubmitForm(formSelector: string, fields: Record<string, string>) {
    const form = this.page.locator(formSelector)

    for (const [field, value] of Object.entries(fields)) {
      await form.locator(`input[name="${field}"], textarea[name="${field}"], select[name="${field}"]`).fill(value)
    }

    await form.locator('button[type="submit"]').click()
  }

  /**
   * Check if element exists without waiting
   */
  async elementExists(selector: string): Promise<boolean> {
    try {
      await this.page.locator(selector).first().waitFor({ timeout: 1000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Get all toast messages
   */
  async getToastMessages(): Promise<string[]> {
    const toasts = await this.page.locator('[data-toast], .toast, [role="alert"]').all()
    return Promise.all(toasts.map(toast => toast.textContent() || ''))
  }

  /**
   * Wait for toast message
   */
  async waitForToast(message: string, timeout = 5000) {
    await expect(this.page.locator(`text=${message}`)).toBeVisible({ timeout })
  }
}