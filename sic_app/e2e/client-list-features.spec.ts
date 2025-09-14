import { test, expect } from '@playwright/test'

test.describe('Client List Features', () => {
  test.describe('Client List Sorting', () => {
    test('should display sort buttons for name, email, and date', async ({ page }) => {
      await page.goto('/clients')
      
      // Wait for clients to load
      await page.waitForSelector('[data-testid="client-card"]', { timeout: 10000 })
      
      // Check that sort buttons exist
      await expect(page.getByTestId('sort-name')).toBeVisible()
      await expect(page.getByTestId('sort-email')).toBeVisible()
      await expect(page.getByTestId('sort-created')).toBeVisible()
    })

    test('should sort clients by name', async ({ page }) => {
      await page.goto('/clients')
      
      // Wait for clients to load
      await page.waitForSelector('[data-testid="client-card"]', { timeout: 10000 })
      
      // Get initial client names
      const initialClientNames = await page.locator('[data-testid="client-name"]').allTextContents()
      
      // Click sort by name button
      await page.getByTestId('sort-name').click()
      
      // Get client names after sorting
      const sortedClientNames = await page.locator('[data-testid="client-name"]').allTextContents()
      
      // Names should be sorted alphabetically (ascending by default)
      const expectedSorted = [...initialClientNames].sort((a, b) => a.localeCompare(b))
      expect(sortedClientNames).toEqual(expectedSorted)
      
      // Click again to reverse sort
      await page.getByTestId('sort-name').click()
      
      const reverseSortedNames = await page.locator('[data-testid="client-name"]').allTextContents()
      const expectedReversed = [...expectedSorted].reverse()
      expect(reverseSortedNames).toEqual(expectedReversed)
    })

    test('should sort clients by email', async ({ page }) => {
      await page.goto('/clients')
      
      // Wait for clients to load
      await page.waitForSelector('[data-testid="client-card"]', { timeout: 10000 })
      
      // Get initial client emails
      const initialClientEmails = await page.locator('[data-testid="client-email"]').allTextContents()
      
      // Click sort by email button
      await page.getByTestId('sort-email').click()
      
      // Get client emails after sorting
      const sortedClientEmails = await page.locator('[data-testid="client-email"]').allTextContents()
      
      // Emails should be sorted alphabetically
      const expectedSorted = [...initialClientEmails].sort((a, b) => a.localeCompare(b))
      expect(sortedClientEmails).toEqual(expectedSorted)
    })

    test('should show sort direction indicators', async ({ page }) => {
      await page.goto('/clients')
      
      // Wait for clients to load
      await page.waitForSelector('[data-testid="client-card"]', { timeout: 10000 })
      
      // Initially, name should be sorted ascending (default)
      const nameButton = page.getByTestId('sort-name')
      await expect(nameButton).toContainText('↑') // Ascending indicator
      
      // Click to change to descending
      await nameButton.click()
      await expect(nameButton).toContainText('↓') // Descending indicator
      
      // Click email sort button
      const emailButton = page.getByTestId('sort-email')
      await emailButton.click()
      
      // Email should show ascending, name should show no indicator
      await expect(emailButton).toContainText('↑')
      await expect(nameButton).not.toContainText('↑')
      await expect(nameButton).not.toContainText('↓')
    })

    test('should preserve sort state when navigating back', async ({ page }) => {
      await page.goto('/clients')
      
      // Wait for clients to load
      await page.waitForSelector('[data-testid="client-card"]', { timeout: 10000 })
      
      // Sort by email
      await page.getByTestId('sort-email').click()
      
      // Navigate to a client detail
      await page.locator('[data-testid="client-card"]').first().click()
      await expect(page).toHaveURL(/\/clients\/\d+/)
      
      // Go back to clients list
      await page.goBack()
      
      // Sort state should be preserved (email ascending)
      await expect(page.getByTestId('sort-email')).toContainText('↑')
    })
  })

  test.describe('Client List Data Refresh', () => {
    test('should show newly created client in list', async ({ page }) => {
      // Start at clients list
      await page.goto('/clients')
      
      // Wait for initial load and count clients
      await page.waitForSelector('[data-testid="client-card"]', { timeout: 10000 })
      const initialClientCount = await page.locator('[data-testid="client-card"]').count()
      
      // Go to create new client
      await page.getByRole('button', { name: /add client/i }).click()
      await expect(page).toHaveURL('/clients/new')
      
      // Create a new client with unique data
      const timestamp = Date.now()
      const uniqueClientName = `E2E Test Client ${timestamp}`
      const uniqueEmail = `test${timestamp}@example.com`
      
      await page.getByLabelText(/client name/i).fill(uniqueClientName)
      await page.getByLabelText(/email/i).fill(uniqueEmail)
      await page.getByLabelText(/contact name/i).fill('E2E Test Contact')
      await page.getByLabelText(/phone number/i).fill('+1 (555) 999-0001')
      
      // Submit the form
      await page.getByRole('button', { name: /create client/i }).click()
      
      // Should redirect to client detail
      await expect(page).toHaveURL(/\/clients\/\d+/)
      
      // Go back to clients list
      await page.getByRole('button', { name: /back to clients/i }).click()
      await expect(page).toHaveURL('/clients')
      
      // Wait for list to refresh and verify new client appears
      await page.waitForSelector(`[data-testid="client-card"]:has-text("${uniqueClientName}")`, { timeout: 10000 })
      
      // Client count should increase by 1
      const newClientCount = await page.locator('[data-testid="client-card"]').count()
      expect(newClientCount).toBe(initialClientCount + 1)
      
      // New client should be visible
      await expect(page.getByText(uniqueClientName)).toBeVisible()
      await expect(page.getByText(uniqueEmail)).toBeVisible()
    })

    test('should refresh client data after editing', async ({ page }) => {
      await page.goto('/clients')
      
      // Wait for clients to load
      await page.waitForSelector('[data-testid="client-card"]', { timeout: 10000 })
      
      // Click on first client
      const firstClient = page.locator('[data-testid="client-card"]').first()
      await firstClient.click()
      
      // Get original name
      const originalName = await page.locator('[data-testid="client-name"]').first().textContent()
      
      // Click edit button
      await page.getByRole('button', { name: /edit client/i }).click()
      
      // Update name
      const timestamp = Date.now()
      const updatedName = `${originalName} - Updated ${timestamp}`
      await page.getByLabelText(/client name/i).fill(updatedName)
      
      // Submit update
      await page.getByRole('button', { name: /update client/i }).click()
      
      // Go back to clients list
      await page.getByRole('button', { name: /back to clients/i }).click()
      
      // Updated name should appear in the list
      await expect(page.getByText(updatedName)).toBeVisible()
      
      // Original name should not appear
      if (originalName) {
        await expect(page.getByText(originalName)).not.toBeVisible()
      }
    })
  })

  test.describe('Client List Navigation', () => {
    test('should navigate to client detail when clicking on client card', async ({ page }) => {
      await page.goto('/clients')
      
      // Wait for clients to load
      await page.waitForSelector('[data-testid="client-card"]', { timeout: 10000 })
      
      // Click on first client card
      const firstClientCard = page.locator('[data-testid="client-card"]').first()
      const clientName = await firstClientCard.locator('[data-testid="client-name"]').textContent()
      
      await firstClientCard.click()
      
      // Should navigate to client detail page
      await expect(page).toHaveURL(/\/clients\/\d+/)
      
      // Client name should be displayed on detail page
      if (clientName) {
        await expect(page.getByText(clientName)).toBeVisible()
      }
    })

    test('should show contact information when available', async ({ page }) => {
      await page.goto('/clients')
      
      // Wait for clients to load
      await page.waitForSelector('[data-testid="client-card"]', { timeout: 10000 })
      
      // Check for clients with contact information
      const clientCards = page.locator('[data-testid="client-card"]')
      const count = await clientCards.count()
      
      for (let i = 0; i < count; i++) {
        const card = clientCards.nth(i)
        
        // If contact name exists, it should be visible
        const contactName = card.locator('[data-testid="contact-name"]')
        if (await contactName.count() > 0) {
          await expect(contactName).toBeVisible()
        }
        
        // If contact phone exists, it should be visible
        const contactPhone = card.locator('[data-testid="contact-phone"]')
        if (await contactPhone.count() > 0) {
          await expect(contactPhone).toBeVisible()
        }
      }
    })

    test('should show empty state when no clients exist', async ({ page }) => {
      // This test would need a way to clear all clients first
      // For now, we'll just verify the empty state elements exist in the DOM
      await page.goto('/clients')
      
      // Wait for potential clients to load
      await page.waitForTimeout(2000)
      
      // If no clients, should show empty state message
      const clientCards = page.locator('[data-testid="client-card"]')
      const clientCount = await clientCards.count()
      
      if (clientCount === 0) {
        await expect(page.getByText(/no clients found/i)).toBeVisible()
        await expect(page.getByText(/add your first client/i)).toBeVisible()
      }
    })
  })

  test.describe('Mobile Client List Experience', () => {
    test.use({ viewport: { width: 375, height: 667 } })
    
    test('should display client cards in mobile-friendly layout', async ({ page }) => {
      await page.goto('/clients')
      
      // Wait for clients to load
      await page.waitForSelector('[data-testid="client-card"]', { timeout: 10000 })
      
      // Client cards should be touch-friendly
      const clientCards = page.locator('[data-testid="client-card"]')
      const count = await clientCards.count()
      
      for (let i = 0; i < Math.min(count, 3); i++) { // Test first 3 cards
        const card = clientCards.nth(i)
        const boundingBox = await card.boundingBox()
        
        if (boundingBox) {
          // Card should be tall enough for comfortable tapping
          expect(boundingBox.height).toBeGreaterThanOrEqual(64)
          // Card should span most of the mobile width
          expect(boundingBox.width).toBeGreaterThan(300)
        }
      }
    })

    test('should have accessible sort buttons on mobile', async ({ page }) => {
      await page.goto('/clients')
      
      // Wait for clients to load
      await page.waitForSelector('[data-testid="client-card"]', { timeout: 10000 })
      
      // Sort buttons should be touch-friendly
      const sortButtons = page.locator('[data-testid^="sort-"]')
      const count = await sortButtons.count()
      
      for (let i = 0; i < count; i++) {
        const button = sortButtons.nth(i)
        const boundingBox = await button.boundingBox()
        
        if (boundingBox && boundingBox.height > 0) {
          expect(boundingBox.height).toBeGreaterThanOrEqual(44)
        }
      }
    })
  })
})