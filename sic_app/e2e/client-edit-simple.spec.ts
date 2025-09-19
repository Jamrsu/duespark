import { test, expect } from '@playwright/test'

test.describe('Client Edit Workflow - Simple', () => {
  test('edit existing client workflow', async ({ page }) => {
    // Step 1: Navigate to clients page
    await page.goto('/clients')
    await expect(page).toHaveURL('/clients')

    // Wait for clients to load
    await page.waitForSelector('[data-testid="client-card"]', { timeout: 10000 })

    // Step 2: Click on the first client
    await page.locator('[data-testid="client-card"]').first().click()

    // Should be on client detail page
    await expect(page.url()).toMatch(/\/clients\/\d+/)

    // Step 3: Click Edit button
    await page.locator('text=Edit Client').click()

    // Should navigate to edit page
    await expect(page.url()).toMatch(/\/clients\/\d+\/edit/)

    // Step 4: Modify client information
    const timestamp = Date.now().toString().slice(-6) // Use last 6 digits to keep name short
    const newName = `EditTest ${timestamp}`

    await page.fill('input[name="name"]', newName)
    await page.fill('input[name="email"]', `edited${timestamp}@example.com`)

    // Step 5: Save changes
    await page.locator('button[type="submit"]').click()

    // Wait a moment for submission
    await page.waitForTimeout(2000)

    // Check if we're still on edit page (indicates an error)
    const currentUrl = page.url()
    if (currentUrl.includes('/edit')) {
      // Look for error messages
      const errorMessage = await page.locator('[role="alert"], .error, .text-red').first().textContent().catch(() => null)
      console.log('Still on edit page. URL:', currentUrl)
      if (errorMessage) {
        console.log('Error message found:', errorMessage)
      }

      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-results/edit-form-error.png' })
    }

    // Should redirect back to client detail page
    await expect(page.url()).toMatch(/\/clients\/\d+/)
    await expect(page.url()).not.toContain('/edit')

    // Step 6: Verify changes were saved
    await expect(page.locator('h1')).toContainText(newName)
  })
})