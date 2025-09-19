import { test, expect } from '@playwright/test'

test.describe('Client Edit Workflow - Critical User Journey', () => {
  // Set up demo user and data
  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions
    await page.context().clearCookies()

    // Go to the app
    await page.goto('/')
  })

  test('complete client editing user journey', async ({ page }) => {
    // Step 1: Navigate to Clients (already authenticated via setup)
    await page.goto('/clients')
    await expect(page).toHaveURL('/clients')

    // Step 3: Create a client if none exist, or use existing
    const clientCount = await page.locator('[data-testid="client-card"]').count()

    if (clientCount === 0) {
      // No clients exist - create one
      await page.click('text=Add Client')
      await expect(page).toHaveURL('/clients/new')

      // Fill out client form
      await page.fill('input[name="name"]', 'Test Client for Editing')
      await page.fill('input[name="email"]', 'testedit@example.com')
      await page.fill('input[name="contact_name"]', 'John Editor')
      await page.fill('input[name="contact_phone"]', '+1-555-EDIT')
      await page.selectOption('select[name="timezone"]', 'America/New_York')

      // Submit form
      await page.click('button[type="submit"]')

      // Should redirect to client detail page
      await expect(page.url()).toMatch(/\/clients\/\d+/)

      // Verify client was created - should show client name in detail view
      await expect(page.locator('h1')).toContainText('Test Client for Editing')
    } else {
      // Step 4: Click on the first client to view details
      await page.click('[data-testid="client-card"]')

      // Should be on client detail page
      await expect(page.url()).toMatch(/\/clients\/\d+/)
    }

    // Step 5: Click Edit button
    await page.click('text=Edit Client')

    // Should navigate to edit page
    await expect(page.url()).toMatch(/\/clients\/\d+\/edit/)

    // Step 6: Modify client information
    const originalName = await page.locator('input[name="name"]').inputValue()
    const newName = `EDITED ${originalName}`

    await page.fill('input[name="name"]', newName)
    await page.fill('input[name="email"]', 'edited@example.com')
    await page.fill('input[name="contact_name"]', 'Jane EDITED')
    await page.selectOption('select[name="timezone"]', 'America/Los_Angeles')

    // Step 7: Save changes
    await page.click('button[type="submit"]')

    // Should redirect back to client detail page
    await expect(page.url()).toMatch(/\/clients\/\d+/)
    await expect(page.url()).not.toContain('/edit')

    // Step 8: Verify changes were saved
    await expect(page.locator('h1')).toContainText(newName)
    await expect(page.locator('text=edited@example.com')).toBeVisible()
    await expect(page.locator('text=Jane EDITED')).toBeVisible()
    await expect(page.locator('text=Pacific Time')).toBeVisible()

    // Step 9: Navigate back to clients list and verify changes persist
    await page.click('text=Clients')
    await expect(page).toHaveURL('/clients')

    // Verify the edited name appears in the list
    await expect(page.locator('[data-testid="client-name"]')).toContainText(newName)
  })

  test('client edit form validation', async ({ page }) => {
    // Navigate to create client to get to edit flow (already authenticated via setup)
    await page.goto('/clients/new')

    // Create a test client first
    await page.fill('input[name="name"]', 'Validation Test Client')
    await page.fill('input[name="email"]', 'validation@example.com')
    await page.click('button[type="submit"]')

    // Navigate to edit the client
    await page.click('[data-testid="client-card"]')
    await page.click('text=Edit Client')

    // Test validation - clear required fields
    await page.fill('input[name="name"]', '')
    await page.fill('input[name="email"]', '')
    await page.click('button[type="submit"]')

    // Should show validation errors
    await expect(page.locator('text=Client name is required')).toBeVisible()
    await expect(page.locator('text=Email is required')).toBeVisible()

    // Test invalid email format
    await page.fill('input[name="name"]', 'Valid Name')
    await page.fill('input[name="email"]', 'invalid-email')
    await page.click('button[type="submit"]')

    // Should show email validation error
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible()
  })

  test('client edit form preview updates', async ({ page }) => {
    // Navigate to client creation (already authenticated via setup)
    await page.goto('/clients/new')
    await page.fill('input[name="name"]', 'Preview Test Client')
    await page.fill('input[name="email"]', 'preview@example.com')
    await page.click('button[type="submit"]')

    // Navigate to edit
    await page.click('[data-testid="client-card"]')
    await page.click('text=Edit Client')

    // Test that preview updates as user types
    await page.fill('input[name="name"]', 'Live Preview Client')

    // Preview should show updated name
    await expect(page.locator('text=Preview:')).toBeVisible()
    await expect(page.locator('text=Live Preview Client')).toBeVisible()

    // Update email and verify preview
    await page.fill('input[name="email"]', 'livepreview@example.com')
    await expect(page.locator('text=livepreview@example.com')).toBeVisible()
  })
})