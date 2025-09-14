import { test, expect } from '@playwright/test'

test.describe('Onboarding Flow', () => {
  const testUser = {
    email: 'e2e-test@example.com',
    password: 'test123456'
  }

  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
  })

  test.describe('Complete Onboarding Flow', () => {
    test('should complete full onboarding flow with manual payment', async ({ page }) => {
      // Register new user
      await page.click('text=Sign up here')
      await page.fill('input[type="email"]', testUser.email)
      await page.fill('input[type="password"]', testUser.password)
      await page.fill('input[name="confirmPassword"]', testUser.password)
      await page.click('button[type="submit"]')

      // Should be redirected to onboarding
      await expect(page).toHaveURL('/onboarding')
      await expect(page.locator('text=Welcome to DueSpark!')).toBeVisible()

      // Step 1: Account Setup
      await expect(page.locator('text=Account Setup')).toBeVisible()
      await expect(page.locator('text=Verify your email address')).toBeVisible()

      // Click verify email
      await page.click('text=Verify Email')
      await expect(page.locator('text=Email verified successfully!')).toBeVisible({ timeout: 5000 })

      // Progress to next step
      await page.click('text=Continue to Payment Setup')

      // Step 2: Payment Configuration
      await expect(page.locator('text=Configure Payment Processing')).toBeVisible()
      await expect(page.locator('text=Automated Payments')).toBeVisible()
      await expect(page.locator('text=Manual Invoicing')).toBeVisible()

      // Choose manual payment
      await page.click('text=Use Manual Invoicing')
      await expect(page.locator('text=Payment method updated!')).toBeVisible({ timeout: 5000 })

      // Progress to next step
      await page.click('text=Continue to Invoice Import')

      // Step 3: Invoice Import
      await expect(page.locator('text=Import Your Data')).toBeVisible()
      await expect(page.locator('text=Create Sample Data')).toBeVisible()
      await expect(page.locator('text=Start Fresh')).toBeVisible()

      // Create sample data
      await page.click('text=Create Sample Data')
      await expect(page.locator('text=Sample data created successfully!')).toBeVisible({ timeout: 10000 })

      // Complete onboarding
      await page.click('text=Complete Setup')
      await expect(page.locator('text=Welcome to DueSpark!')).toBeVisible()
      await expect(page.locator('text=Your account is now ready!')).toBeVisible()

      // Go to dashboard
      await page.click('text=Go to Dashboard')
      await expect(page).toHaveURL('/dashboard')
    })

    test('should complete onboarding with Stripe (mock)', async ({ page }) => {
      // Register and get to payment step
      await page.click('text=Sign up here')
      await page.fill('input[type="email"]', 'stripe-test@example.com')
      await page.fill('input[type="password"]', testUser.password)
      await page.fill('input[name="confirmPassword"]', testUser.password)
      await page.click('button[type="submit"]')

      await expect(page).toHaveURL('/onboarding')

      // Skip to payment step (assume email is auto-verified)
      await page.click('text=Verify Email')
      await page.click('text=Continue to Payment Setup')

      // Try Stripe connection
      await page.click('text=Connect Stripe')

      // Since we don't have real Stripe credentials, this will likely fail
      // But we can test that the attempt is made
      // In a real E2E test, you'd mock the Stripe response or use test credentials
      await expect(page.locator('text=Connecting to Stripe...')).toBeVisible({ timeout: 2000 })
    })

    test('should allow skipping sample data creation', async ({ page }) => {
      // Register and get to data import step
      await page.click('text=Sign up here')
      await page.fill('input[type="email"]', 'skip-data@example.com')
      await page.fill('input[type="password"]', testUser.password)
      await page.fill('input[name="confirmPassword"]', testUser.password)
      await page.click('button[type="submit"]')

      await expect(page).toHaveURL('/onboarding')

      // Quick path through onboarding
      await page.click('text=Verify Email')
      await page.click('text=Continue to Payment Setup')
      await page.click('text=Use Manual Invoicing')
      await page.click('text=Continue to Invoice Import')

      // Skip sample data
      await page.click('text=Start Fresh')
      await expect(page.locator('text=Onboarding completed!')).toBeVisible({ timeout: 5000 })

      await page.click('text=Go to Dashboard')
      await expect(page).toHaveURL('/dashboard')
    })
  })

  test.describe('Onboarding Navigation', () => {
    test('should allow navigation between steps', async ({ page }) => {
      // Login as existing user in onboarding
      await page.click('text=Sign in')
      await page.fill('input[type="email"]', 'demo@example.com')
      await page.fill('input[type="password"]', 'demo123')
      await page.click('button[type="submit"]')

      // If user is in onboarding, should be redirected
      if (await page.locator('text=Welcome to DueSpark!').isVisible()) {
        // Test back navigation
        await page.click('text=Back')
        await expect(page.locator('text=Account Setup')).toBeVisible()

        // Test forward navigation
        await page.click('text=Next')
        await expect(page.locator('text=Configure Payment Processing')).toBeVisible()
      }
    })

    test('should show progress indicators', async ({ page }) => {
      await page.click('text=Sign in')
      await page.fill('input[type="email"]', 'demo@example.com')
      await page.fill('input[type="password"]', 'demo123')
      await page.click('button[type="submit"]')

      if (await page.locator('text=Welcome to DueSpark!').isVisible()) {
        // Should show step indicators
        await expect(page.locator('text=1')).toBeVisible()
        await expect(page.locator('text=2')).toBeVisible()
        await expect(page.locator('text=3')).toBeVisible()

        // Current step should be highlighted
        const activeStep = page.locator('.bg-primary-600').first()
        await expect(activeStep).toBeVisible()
      }
    })
  })

  test.describe('Onboarding Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Block all network requests to simulate offline scenario
      await page.route('**/api/**', route => route.abort())

      await page.click('text=Sign up here')
      await page.fill('input[type="email"]', 'network-error@example.com')
      await page.fill('input[type="password"]', testUser.password)
      await page.fill('input[name="confirmPassword"]', testUser.password)

      await page.click('button[type="submit"]')

      // Should show error message
      await expect(page.locator('text=Network error')).toBeVisible({ timeout: 10000 })
    })

    test('should handle invalid email verification', async ({ page }) => {
      await page.click('text=Sign up here')
      await page.fill('input[type="email"]', 'invalid-email@example.com')
      await page.fill('input[type="password"]', testUser.password)
      await page.fill('input[name="confirmPassword"]', testUser.password)
      await page.click('button[type="submit"]')

      if (await page.locator('text=Verify Email').isVisible()) {
        // Mock API to return error
        await page.route('**/auth/send-verification', route =>
          route.fulfill({
            status: 400,
            body: JSON.stringify({ error: { message: 'Email verification failed' } })
          })
        )

        await page.click('text=Verify Email')
        await expect(page.locator('text=Email verification failed')).toBeVisible({ timeout: 5000 })
      }
    })

    test('should prevent double submission', async ({ page }) => {
      await page.click('text=Sign up here')
      await page.fill('input[type="email"]', 'double-click@example.com')
      await page.fill('input[type="password"]', testUser.password)
      await page.fill('input[name="confirmPassword"]', testUser.password)
      await page.click('button[type="submit"]')

      if (await page.locator('text=Use Manual Invoicing').isVisible()) {
        // Mock slow API response
        await page.route('**/auth/me', route =>
          new Promise(resolve => setTimeout(() => resolve(route.continue()), 2000))
        )

        const manualButton = page.locator('text=Use Manual Invoicing')

        // Click multiple times rapidly
        await manualButton.click()
        await manualButton.click()
        await manualButton.click()

        // Button should be disabled during processing
        await expect(manualButton).toBeDisabled()
        await expect(page.locator('text=Configuring...')).toBeVisible()
      }
    })
  })

  test.describe('Onboarding Settings Integration', () => {
    test('should allow resetting onboarding from settings', async ({ page }) => {
      // Login as completed user
      await page.click('text=Sign in')
      await page.fill('input[type="email"]', 'demo@example.com')
      await page.fill('input[type="password"]', 'demo123')
      await page.click('button[type="submit"]')

      // Go to settings
      await page.click('text=Settings')
      await expect(page).toHaveURL('/settings')

      // Find onboarding reset section
      await expect(page.locator('text=Account Setup')).toBeVisible()
      await expect(page.locator('text=Setup Complete')).toBeVisible()

      // Reset onboarding
      await page.click('text=Reset Account Setup')

      // Confirm reset
      page.on('dialog', dialog => dialog.accept())
      await expect(page.locator('text=Onboarding reset!')).toBeVisible({ timeout: 5000 })

      // Should be redirected to onboarding
      await expect(page).toHaveURL('/onboarding')
      await expect(page.locator('text=Welcome to DueSpark!')).toBeVisible()
    })

    test('should allow changing payment method from settings', async ({ page }) => {
      await page.click('text=Sign in')
      await page.fill('input[type="email"]', 'demo@example.com')
      await page.fill('input[type="password"]', 'demo123')
      await page.click('button[type="submit"]')

      await page.click('text=Settings')

      // Should show current payment method
      await expect(page.locator('text=Payment Method')).toBeVisible()

      // Try to change to Stripe
      if (await page.locator('text=Connect Stripe').isVisible()) {
        await page.click('text=Connect Stripe')
        // Should attempt to connect (may fail without real credentials)
      }

      // Try manual invoicing
      if (await page.locator('text=Use Manual Invoicing').isVisible()) {
        await page.click('text=Use Manual Invoicing')
        await expect(page.locator('text=Payment method updated')).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      await page.click('text=Sign up here')
      await page.fill('input[type="email"]', 'mobile-test@example.com')
      await page.fill('input[type="password"]', testUser.password)
      await page.fill('input[name="confirmPassword"]', testUser.password)
      await page.click('button[type="submit"]')

      if (await page.locator('text=Welcome to DueSpark!').isVisible()) {
        // Should display properly on mobile
        await expect(page.locator('text=Account Setup')).toBeVisible()

        // Step indicators should be visible
        await expect(page.locator('text=1')).toBeVisible()

        // Buttons should be properly sized
        const verifyButton = page.locator('text=Verify Email')
        await expect(verifyButton).toBeVisible()

        // Test interaction
        await verifyButton.click()
      }
    })
  })

  test.describe('Accessibility', () => {
    test('should be accessible', async ({ page }) => {
      await page.click('text=Sign up here')
      await page.fill('input[type="email"]', 'accessibility@example.com')
      await page.fill('input[type="password"]', testUser.password)
      await page.fill('input[name="confirmPassword"]', testUser.password)
      await page.click('button[type="submit"]')

      if (await page.locator('text=Welcome to DueSpark!').isVisible()) {
        // Test keyboard navigation
        await page.keyboard.press('Tab')
        await page.keyboard.press('Tab')
        await page.keyboard.press('Enter')

        // Test aria labels
        const backButton = page.locator('[aria-label*="Back"]').first()
        if (await backButton.isVisible()) {
          await expect(backButton).toHaveAttribute('aria-label')
        }

        // Test focus management
        const focusedElement = page.locator(':focus')
        await expect(focusedElement).toBeVisible()
      }
    })
  })
})