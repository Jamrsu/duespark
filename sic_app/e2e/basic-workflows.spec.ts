import { test, expect } from '@playwright/test'

test.describe('Basic Application Workflows', () => {
  test('should navigate to clients page and show client list', async ({ page }) => {
    await page.goto('/clients')
    
    // Should show clients page title
    await expect(page.locator('h1:has-text("Clients")')).toBeVisible()
    
    // Should have Add Client button
    await expect(page.getByRole('button', { name: /add client/i })).toBeVisible()
    
    // Should show sorting options
    await expect(page.getByTestId('sort-name')).toBeVisible()
    await expect(page.getByTestId('sort-email')).toBeVisible()
    await expect(page.getByTestId('sort-created')).toBeVisible()
  })

  test('should navigate to create client form', async ({ page }) => {
    await page.goto('/clients')
    
    // Click Add Client button
    await page.getByRole('button', { name: /add client/i }).click()
    
    // Should navigate to client creation form
    await expect(page).toHaveURL('/clients/new')
    await expect(page.getByText('Add New Client')).toBeVisible()
  })

  test('should show client sorting with indicators', async ({ page }) => {
    await page.goto('/clients')
    
    // Name should be the default sort (ascending)
    const nameButton = page.getByTestId('sort-name')
    await expect(nameButton).toContainText('↑')
    
    // Click email sort
    const emailButton = page.getByTestId('sort-email')
    await emailButton.click()
    
    // Email should now show ascending, name should not show indicator
    await expect(emailButton).toContainText('↑')
    await expect(nameButton).not.toContainText('↑')
    await expect(nameButton).not.toContainText('↓')
    
    // Click email again to reverse
    await emailButton.click()
    await expect(emailButton).toContainText('↓')
  })

  test('should navigate between views using bottom navigation', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/dashboard')
    
    // Should show bottom navigation
    const bottomNav = page.getByTestId('bottom-navigation')
    await expect(bottomNav).toBeVisible()
    
    // Click on clients
    await page.getByTestId('bottom-nav-clients').click({ force: true })
    await page.waitForURL(/\/clients/)
    await expect(page).toHaveURL(/\/clients/)
    
    // Click on invoices
    await page.getByTestId('bottom-nav-invoices').click({ force: true })
    await page.waitForURL(/\/invoices/)
    await expect(page).toHaveURL(/\/invoices/)
    
    // Click on settings
    await page.getByTestId('bottom-nav-settings').click({ force: true })
    await page.waitForURL(/\/settings/)
    await expect(page).toHaveURL(/\/settings/)
    
    // Back to dashboard
    await page.getByTestId('bottom-nav-dashboard').click({ force: true })
    await page.waitForURL('/dashboard')
    await expect(page).toHaveURL('/dashboard')
  })
})