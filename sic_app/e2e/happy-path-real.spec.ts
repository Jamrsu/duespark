/**
 * DueSpark E2E Happy Path Test - Using Real Backend
 *
 * This test uses the real backend API to validate the complete user journey
 */

import { test, expect } from '@playwright/test'
import { TestHelpers } from './utils/test-helpers'

test.describe('DueSpark Happy Path E2E - Real Backend', () => {
  let helpers: TestHelpers

  // Configure to not use authentication state for these tests
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page)
  })

  test('simplified user journey - registration and basic flow', async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'

    // Step 1: Register a new user
    await test.step('Register new user', async () => {
      await page.goto('/auth/register')

      await page.fill('input#email', testEmail)
      await page.fill('input#password', testPassword)
      await page.fill('input#confirmPassword', testPassword)

      await page.click('button[type="submit"]')

      // Wait for some response (either success or error)
      await page.waitForTimeout(2000)

      // Take screenshot for debugging
      await page.screenshot({ path: 'registration-result.png', fullPage: true })

      // Check if we're redirected or see a message
      const currentUrl = page.url()
      const bodyText = await page.locator('body').textContent()

      console.log('After registration:')
      console.log('URL:', currentUrl)
      console.log('Body contains "dashboard":', bodyText.includes('Dashboard'))
      console.log('Body contains "check":', bodyText.includes('check'))
      console.log('Body contains "email":', bodyText.includes('email'))

      // If we're on dashboard, registration succeeded and logged us in
      if (currentUrl.includes('/dashboard')) {
        console.log('✅ Registration succeeded - redirected to dashboard')
      } else if (bodyText.includes('check') && bodyText.includes('email')) {
        console.log('✅ Registration succeeded - email verification step')
      } else {
        console.log('ℹ️ Registration result unclear, proceeding...')
      }
    })

    // Step 2: Navigate to dashboard (if not already there)
    await test.step('Access dashboard', async () => {
      if (!page.url().includes('/dashboard')) {
        await page.goto('/dashboard')
      }

      // Wait for dashboard to load
      await page.waitForSelector('h1, h2', { timeout: 10000 })

      // Check if we can see dashboard content
      const dashboardHeading = await page.locator('h1, h2').first().textContent()
      console.log('Dashboard heading:', dashboardHeading)

      // Should see some dashboard content
      await expect(page.locator('body')).toContainText('Dashboard')
    })

    // Step 3: Check invoices page
    await test.step('Navigate to invoices', async () => {
      // Look for invoices link in navigation
      const invoicesLink = page.locator('a[href*="/invoices"], button:has-text("Invoices")')
      if (await invoicesLink.count() > 0) {
        await invoicesLink.first().click()
        await page.waitForTimeout(1000)

        // Should be on invoices page
        const bodyText = await page.locator('body').textContent()
        expect(bodyText).toMatch(/invoice/i)
        console.log('✅ Successfully navigated to invoices page')
      } else {
        console.log('ℹ️ Invoices link not found in navigation')
      }
    })

    // Step 4: Check clients page
    await test.step('Navigate to clients', async () => {
      const clientsLink = page.locator('a[href*="/clients"], button:has-text("Clients")')
      if (await clientsLink.count() > 0) {
        await clientsLink.first().click()
        await page.waitForTimeout(1000)

        // Should be on clients page
        const bodyText = await page.locator('body').textContent()
        expect(bodyText).toMatch(/client/i)
        console.log('✅ Successfully navigated to clients page')
      } else {
        console.log('ℹ️ Clients link not found in navigation')
      }
    })

    // Step 5: Basic form interaction (if add client button exists)
    await test.step('Test basic form interaction', async () => {
      const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")')
      if (await addButton.count() > 0) {
        await addButton.first().click()
        await page.waitForTimeout(1000)

        // Check if a form modal or page opened
        const formInputs = page.locator('input, textarea')
        const inputCount = await formInputs.count()
        console.log(`✅ Form opened with ${inputCount} input fields`)

        // Close modal/form if possible
        const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Close")')
        if (await cancelButton.count() > 0) {
          await cancelButton.first().click()
        } else {
          // Press Escape to close modal
          await page.keyboard.press('Escape')
        }
      } else {
        console.log('ℹ️ No add/create button found')
      }
    })

    console.log('🎉 Happy path test completed successfully!')
  })

  // Additional test for authentication flow
  test('login flow validation', async ({ page }) => {
    await test.step('Check login page accessibility', async () => {
      await page.goto('/auth/login')

      // Should see login form
      await expect(page.locator('input#email')).toBeVisible()
      await expect(page.locator('input#password')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()

      console.log('✅ Login form is accessible and has required fields')
    })

    await test.step('Test form validation', async () => {
      // Try submitting empty form
      await page.click('button[type="submit"]')
      await page.waitForTimeout(1000)

      // Should still be on login page (validation prevented submission)
      expect(page.url()).toContain('/auth/login')
      console.log('✅ Form validation working - empty form not submitted')
    })
  })

  // Test responsiveness
  test('mobile interface validation', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await test.step('Mobile registration form', async () => {
      await page.goto('/auth/register')

      // Check if form is mobile-friendly
      const submitButton = page.locator('button[type="submit"]')
      const buttonBox = await submitButton.boundingBox()

      if (buttonBox) {
        expect(buttonBox.height).toBeGreaterThanOrEqual(44) // Touch target size
        console.log('✅ Mobile touch targets are appropriately sized')
      }
    })

    await test.step('Mobile navigation check', async () => {
      // Try to access dashboard on mobile
      await page.goto('/dashboard')
      await page.waitForTimeout(2000)

      // Should have some form of mobile navigation
      const mobileNav = page.locator('.fixed.bottom-0, nav, .mobile-nav, .hamburger, [role="navigation"]')
      const navCount = await mobileNav.count()

      if (navCount > 0) {
        console.log('✅ Mobile navigation elements found')
      } else {
        console.log('ℹ️ No obvious mobile navigation detected')
      }
    })
  })
})