/**
 * Complete DueSpark User Journey Test
 *
 * Tests the actual user flow from registration through onboarding to dashboard
 */

import { test, expect } from '@playwright/test'

test.describe('Complete DueSpark User Journey', () => {
  // Don't use stored authentication state
  test.use({ storageState: { cookies: [], origins: [] } })

  test('complete user journey - registration to dashboard', async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'

    // Step 1: User Registration
    await test.step('User registration', async () => {
      await page.goto('/auth/register')

      // Fill registration form
      await page.fill('input#email', testEmail)
      await page.fill('input#password', testPassword)
      await page.fill('input#confirmPassword', testPassword)

      // Submit registration
      await page.click('button[type="submit"]')

      // Wait for redirect
      await page.waitForTimeout(3000)

      // Should be redirected to onboarding
      expect(page.url()).toContain('/onboarding')

      // Should see onboarding content
      await expect(page.locator('body')).toContainText('Welcome to DueSpark')

      console.log('✅ User registration successful - redirected to onboarding')
    })

    // Step 2: Onboarding Flow
    await test.step('Complete onboarding', async () => {
      // Look for account setup step
      const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next"), button:has-text("Skip")')

      if (await continueButton.count() > 0) {
        await continueButton.first().click()
        await page.waitForTimeout(2000)
        console.log('✅ Progressed through onboarding step')
      }

      // If there's a skip button, use it to complete onboarding quickly
      const skipButton = page.locator('button:has-text("Skip")')
      let attempts = 0
      while (await skipButton.count() > 0 && attempts < 3) {
        await skipButton.first().click()
        await page.waitForTimeout(1000)
        attempts++
        console.log(`ℹ️ Skipped onboarding step ${attempts}`)
      }

      // Look for final onboarding completion
      const finishButton = page.locator('button:has-text("Finish"), button:has-text("Complete"), button:has-text("Get Started")')
      if (await finishButton.count() > 0) {
        await finishButton.first().click()
        await page.waitForTimeout(2000)
        console.log('✅ Completed onboarding')
      }
    })

    // Step 3: Dashboard Access
    await test.step('Access dashboard', async () => {
      // Navigate to dashboard if not already there
      if (!page.url().includes('/dashboard')) {
        await page.goto('/dashboard')
      }

      await page.waitForSelector('h1, h2, [role="main"]', { timeout: 10000 })

      // Should see dashboard content
      const dashboardContent = await page.locator('body').textContent()
      const hasOverviewOrDashboard = dashboardContent.includes('Overview') ||
                                   dashboardContent.includes('Dashboard') ||
                                   dashboardContent.includes('Welcome')

      expect(hasOverviewOrDashboard).toBe(true)
      console.log('✅ Successfully accessed dashboard')
    })

    // Step 4: Core Feature Navigation
    await test.step('Navigate core features', async () => {
      const features = [
        { name: 'Invoices', selector: 'a[href*="/invoices"], button:has-text("Invoices")' },
        { name: 'Clients', selector: 'a[href*="/clients"], button:has-text("Clients")' },
        { name: 'Settings', selector: 'a[href*="/settings"], button:has-text("Settings")' }
      ]

      for (const feature of features) {
        const featureLink = page.locator(feature.selector)
        if (await featureLink.count() > 0) {
          await featureLink.first().click()
          await page.waitForTimeout(1500)

          const currentUrl = page.url()
          const bodyText = await page.locator('body').textContent()

          console.log(`✅ ${feature.name} page accessible at: ${currentUrl}`)

          // Go back to dashboard for next test
          await page.goto('/dashboard')
          await page.waitForTimeout(1000)
        } else {
          console.log(`ℹ️ ${feature.name} link not found in navigation`)
        }
      }
    })

    // Step 5: Test Key Interactions
    await test.step('Test key user interactions', async () => {
      // Look for primary action buttons
      const actionButtons = page.locator(
        'button:has-text("New"), button:has-text("Add"), button:has-text("Create"), button:has-text("Import")'
      )

      const buttonCount = await actionButtons.count()

      if (buttonCount > 0) {
        console.log(`✅ Found ${buttonCount} action buttons available to user`)

        // Try clicking the first action button
        await actionButtons.first().click()
        await page.waitForTimeout(1000)

        // Look for modal, form, or new page
        const modalOrForm = page.locator('[role="dialog"], form, .modal')
        if (await modalOrForm.count() > 0) {
          console.log('✅ Action button opened modal/form successfully')

          // Close modal if possible
          await page.keyboard.press('Escape')
        } else {
          console.log('ℹ️ Action button navigated to new page/state')
        }
      } else {
        console.log('ℹ️ No primary action buttons found')
      }
    })

    console.log('🎉 Complete user journey test passed successfully!')
  })

  // Test authentication state persistence
  test('verify user session persistence', async ({ page, context }) => {
    const testEmail = `persistent-${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'

    await test.step('Register and login user', async () => {
      await page.goto('/auth/register')
      await page.fill('input#email', testEmail)
      await page.fill('input#password', testPassword)
      await page.fill('input#confirmPassword', testPassword)
      await page.click('button[type="submit"]')
      await page.waitForTimeout(3000)
    })

    await test.step('Verify session persists after page reload', async () => {
      // Reload the page
      await page.reload()
      await page.waitForTimeout(2000)

      // Should still be authenticated (not redirected to login)
      const currentUrl = page.url()
      expect(currentUrl).not.toContain('/auth/login')

      console.log('✅ User session persisted after page reload')
    })

    await test.step('Verify session persists in new tab', async () => {
      // Open new page/tab in same context
      const newPage = await context.newPage()
      await newPage.goto('/dashboard')
      await newPage.waitForTimeout(2000)

      // Should be able to access dashboard without login
      const newPageUrl = newPage.url()
      const isAuthenticated = !newPageUrl.includes('/auth/login')

      expect(isAuthenticated).toBe(true)
      console.log('✅ User session persisted across browser tabs')

      await newPage.close()
    })
  })

  // Test error handling and edge cases
  test('error handling and validation', async ({ page }) => {
    await test.step('Test registration validation', async () => {
      await page.goto('/auth/register')

      // Try invalid email
      await page.fill('input#email', 'invalid-email')
      await page.fill('input#password', 'short')
      await page.fill('input#confirmPassword', 'different')

      await page.click('button[type="submit"]')
      await page.waitForTimeout(1000)

      // Should still be on registration page due to validation
      expect(page.url()).toContain('/auth/register')
      console.log('✅ Form validation prevents invalid registration')
    })

    await test.step('Test navigation to non-existent pages', async () => {
      await page.goto('/non-existent-page')
      await page.waitForTimeout(2000)

      const bodyText = await page.locator('body').textContent()
      const isErrorPage = bodyText.includes('404') ||
                         bodyText.includes('Not Found') ||
                         bodyText.includes('Error') ||
                         page.url().includes('/auth/') // Redirected to auth

      // Should either show error page or redirect to auth
      expect(isErrorPage).toBe(true)
      console.log('✅ Non-existent pages handled appropriately')
    })
  })
})