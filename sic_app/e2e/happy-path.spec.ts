/**
 * DueSpark E2E Happy Path Test
 *
 * This test covers the complete user journey:
 * 1. Register a new user
 * 2. Verify email (mock link)
 * 3. Log in to the dashboard
 * 4. Connect Stripe in sandbox (mock OAuth)
 * 5. Import sample invoices (fixture)
 * 6. Create a reminder
 * 7. Preview email
 * 8. Schedule send
 * 9. Advance clock
 * 10. Assert email webhook received
 * 11. Mark invoice paid
 * 12. Check analytics summary updates
 */

import { test, expect } from '@playwright/test'
import { ApiMocker } from './utils/api-mocks'
import { TimeController, SchedulerSimulator, timeUtils } from './utils/time-utils'
import { TestHelpers } from './utils/test-helpers'
import { testUsers, testRegistrations, mockEmailVerificationToken } from './fixtures/users'
import { testClients, testInvoices } from './fixtures/invoices'
import { testReminders, mockEmailWebhooks } from './fixtures/reminders'

test.describe('DueSpark Happy Path E2E', () => {
  let apiMocker: ApiMocker
  let timeController: TimeController
  let scheduler: SchedulerSimulator
  let helpers: TestHelpers

  // Configure to not use authentication state for these tests
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ page }) => {
    // Initialize utilities
    apiMocker = new ApiMocker(page, { baseURL: 'http://localhost:8000' })
    timeController = new TimeController(page)
    scheduler = new SchedulerSimulator(page)
    helpers = new TestHelpers(page)

    // Set up all API mocks
    await apiMocker.mockAllEndpoints()

    // Set initial time
    await timeController.setSystemTime(new Date('2024-02-10T09:00:00Z'))
  })

  test('complete user journey from registration to payment', async ({ page }) => {
    // Step 1: Register a new user
    await test.step('Register new user', async () => {
      await helpers.registerUser(testRegistrations.valid)

      // Should show registration success message
      await expect(page.locator('text=Please check your email for verification')).toBeVisible()

      // Should receive email verification token
      await expect(page).toHaveURL(/\/auth\/check-email/)
    })

    // Step 2: Verify email (mock link)
    await test.step('Verify email address', async () => {
      await helpers.verifyEmail(mockEmailVerificationToken)

      // Should show email verified message
      await expect(page.locator('text=Email verified successfully')).toBeVisible()

      // Should redirect to onboarding
      await expect(page).toHaveURL(/\/onboarding/)
    })

    // Step 3: Log in to the dashboard
    await test.step('Log in user', async () => {
      await helpers.loginUser('verified@test.com', 'TestPassword123!')

      // Should be on dashboard
      await expect(page).toHaveURL('/dashboard')
      await expect(page.locator('h1')).toContainText('Dashboard')

      // Should show welcome message for new user
      await expect(page.locator('text=Welcome to DueSpark')).toBeVisible()
    })

    // Step 4: Connect Stripe in sandbox (mock OAuth)
    await test.step('Connect Stripe account', async () => {
      // Navigate to onboarding payment step or integrations
      await page.goto('/onboarding/payment')

      await helpers.connectStripeAccount()

      // Verify Stripe connection status
      await expect(page.locator('text=Stripe Connected')).toBeVisible()
      await expect(page.locator('[data-testid="stripe-status"]')).toContainText('Connected')
    })

    // Step 5: Import sample invoices (fixture)
    await test.step('Import invoices from Stripe', async () => {
      await helpers.importStripeInvoices()

      // Should show import success
      await expect(page.locator('text=2 invoices imported')).toBeVisible()

      // Navigate to invoices page to verify
      await page.goto('/invoices')
      await expect(page.locator('table tbody tr')).toHaveCount(2)

      // Verify invoice data
      await expect(page.locator('text=STRIPE-001')).toBeVisible()
      await expect(page.locator('text=STRIPE-002')).toBeVisible()
      await expect(page.locator('text=$1,500.00')).toBeVisible()
      await expect(page.locator('text=$2,500.00')).toBeVisible()
    })

    // Step 6: Create a reminder
    await test.step('Create payment reminder', async () => {
      await helpers.createReminder({
        invoiceNumber: 'STRIPE-001',
        scheduledDate: '2024-02-15T10:00:00Z',
        template: 'Payment Reminder',
        customMessage: 'This is a friendly reminder about your upcoming payment.'
      })

      // Verify reminder was created
      await page.goto('/reminders')
      await expect(page.locator('table tbody tr')).toHaveCount(1)
      await expect(page.locator('text=Payment Reminder')).toBeVisible()
      await expect(page.locator('text=Scheduled')).toBeVisible()
    })

    // Step 7: Preview email
    await test.step('Preview reminder email', async () => {
      const preview = await helpers.previewEmail()

      expect(preview.subject).toContain('Payment Reminder for Invoice STRIPE-001')
      expect(preview.body).toContain('$1,500.00')
      expect(preview.body).toContain('This is a friendly reminder')

      // Close preview modal
      await page.keyboard.press('Escape')
    })

    // Step 8: Schedule send (already scheduled, but confirm it's ready)
    await test.step('Confirm reminder is scheduled', async () => {
      await page.goto('/reminders')

      // Find the reminder row
      const reminderRow = page.locator('tr:has-text("Payment Reminder")')
      await expect(reminderRow.locator('td:has-text("Scheduled")')).toBeVisible()

      // Verify scheduled time
      const scheduledTime = await reminderRow.locator('[data-testid="scheduled-time"]').textContent()
      expect(scheduledTime).toContain('Feb 15, 2024')
    })

    // Step 9: Advance clock to trigger scheduler
    await test.step('Advance time to scheduled reminder', async () => {
      // Advance to reminder time
      await timeController.setSystemTime(new Date('2024-02-15T10:00:00Z'))

      // Trigger scheduler run
      const schedulerResult = await scheduler.triggerScheduler()
      expect(schedulerResult.processed).toBe(1)
      expect(schedulerResult.sent).toBe(1)

      // Verify current time
      const currentTime = await timeController.getCurrentTime()
      expect(currentTime.toISOString()).toBe('2024-02-15T10:00:00.000Z')
    })

    // Step 10: Assert email webhook received
    await test.step('Verify email was sent and webhook received', async () => {
      // Simulate email delivery webhook
      await helpers.simulateWebhook(mockEmailWebhooks.delivered)

      // Simulate email opened webhook
      await helpers.simulateWebhook(mockEmailWebhooks.opened)

      // Check reminder status updated
      await page.goto('/reminders')
      await page.reload()

      const reminderRow = page.locator('tr:has-text("Payment Reminder")')
      await expect(reminderRow.locator('td:has-text("Sent")')).toBeVisible()

      // Check analytics updated with email metrics
      await page.goto('/analytics')
      await expect(page.locator('[data-testid="emails-sent"]')).toContainText('1')
      await expect(page.locator('[data-testid="emails-opened"]')).toContainText('1')
    })

    // Step 11: Mark invoice paid
    await test.step('Mark invoice as paid', async () => {
      await helpers.markInvoicePaid('STRIPE-001')

      // Verify invoice status changed
      await page.goto('/invoices')
      const invoiceRow = page.locator('tr:has-text("STRIPE-001")')
      await expect(invoiceRow.locator('td:has-text("Paid")')).toBeVisible()

      // Should show success toast
      await helpers.waitForToast('Invoice updated successfully')
    })

    // Step 12: Check analytics summary updates
    await test.step('Verify analytics are updated', async () => {
      const analytics = await helpers.getAnalyticsData()

      // Revenue should reflect the paid invoice
      expect(analytics.totalRevenue).toContain('$1,500')

      // Paid invoices count should be 1
      expect(analytics.paidInvoices).toContain('1')

      // Pending invoices should be 1 (the remaining STRIPE-002)
      expect(analytics.pendingInvoices).toContain('1')

      // Reminders sent should be 1
      expect(analytics.remindersSent).toContain('1')

      // Email open rate should be 100% (1/1)
      expect(analytics.emailOpenRate).toContain('100%')
    })

    // Bonus: Test reminder automation cycle
    await test.step('Test complete reminder automation cycle', async () => {
      // Create another reminder for the second invoice (overdue)
      await helpers.createReminder({
        invoiceNumber: 'STRIPE-002',
        scheduledDate: '2024-02-16T14:00:00Z',
        template: 'Overdue Notice'
      })

      // Advance time to next day
      await timeController.setSystemTime(new Date('2024-02-16T14:00:00Z'))

      // Trigger scheduler again
      const schedulerResult = await scheduler.triggerScheduler()
      expect(schedulerResult.processed).toBeGreaterThanOrEqual(1)

      // Simulate email webhook events
      await helpers.simulateWebhook(mockEmailWebhooks.delivered)
      await helpers.simulateWebhook(mockEmailWebhooks.clicked)

      // Check updated analytics
      await page.goto('/analytics')
      await page.reload()

      // Should show 2 reminders sent
      await expect(page.locator('[data-testid="reminders-sent"]')).toContainText('2')

      // Should show email engagement metrics
      await expect(page.locator('[data-testid="email-click-rate"]')).toBeVisible()
    })
  })

  // Additional test for error handling and edge cases
  test('handles error scenarios gracefully', async ({ page }) => {
    // Test with existing email
    await test.step('Registration with existing email', async () => {
      await helpers.registerUser({
        email: 'existing@test.com',
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!'
      })

      await expect(page.locator('text=User already exists')).toBeVisible()
    })

    // Test with invalid credentials
    await test.step('Login with invalid credentials', async () => {
      await helpers.loginUser('invalid@test.com', 'wrongpassword')

      await expect(page.locator('text=Invalid credentials')).toBeVisible()
      await expect(page).toHaveURL(/\/auth\/login/)
    })

    // Test email bounce handling
    await test.step('Handle email bounce webhook', async () => {
      // First, set up authenticated user
      await helpers.setAuthToken(undefined, testUsers.completeUser)
      await page.goto('/dashboard')

      // Create and send reminder
      await helpers.createReminder({
        invoiceNumber: 'STRIPE-001',
        scheduledDate: '2024-02-15T10:00:00Z'
      })

      // Advance time and trigger
      await timeController.setSystemTime(new Date('2024-02-15T10:00:00Z'))
      await scheduler.triggerScheduler()

      // Simulate bounce webhook
      await helpers.simulateWebhook(mockEmailWebhooks.bounced)

      // Check reminder status shows failed
      await page.goto('/reminders')
      await expect(page.locator('text=Failed')).toBeVisible()

      // Should show bounce reason
      await expect(page.locator('text=User unknown')).toBeVisible()
    })
  })

  // Test mobile responsiveness during critical flows
  test('critical flows work on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await test.step('Mobile registration flow', async () => {
      await helpers.registerUser(testRegistrations.valid)
      await expect(page.locator('text=Please check your email')).toBeVisible()

      // Check responsive layout
      const submitButton = page.locator('button[type="submit"]')
      const buttonBox = await submitButton.boundingBox()
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44) // Touch target size
    })

    await test.step('Mobile dashboard navigation', async () => {
      await helpers.setAuthToken(undefined, testUsers.completeUser)
      await page.goto('/dashboard')

      // Bottom navigation should be visible and touch-friendly
      const bottomNav = page.locator('.fixed.bottom-0')
      await expect(bottomNav).toBeVisible()

      const navItems = bottomNav.locator('a, button')
      const count = await navItems.count()
      for (let i = 0; i < count; i++) {
        const item = navItems.nth(i)
        const boundingBox = await item.boundingBox()
        expect(boundingBox?.height).toBeGreaterThanOrEqual(48)
      }
    })
  })

  test.afterEach(async ({ page }) => {
    // Reset time for other tests
    await timeController.resetTime()

    // Take screenshot if test failed
    if (test.info().status === 'failed') {
      await helpers.takeScreenshot(`failed-${test.info().title}`)
    }
  })
})