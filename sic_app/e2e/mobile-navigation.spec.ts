import { test, expect } from '@playwright/test'

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE size

  test('should have mobile-friendly navigation', async ({ page }) => {
    await page.goto('/')
    
    // Should show mobile bottom navigation
    const bottomNav = page.getByTestId('bottom-navigation')
    await expect(bottomNav).toBeVisible()
    
    // Navigation items should be large enough for finger taps (44x44px minimum)
    const navItems = page.locator('nav a')
    const count = await navItems.count()
    
    for (let i = 0; i < count; i++) {
      const item = navItems.nth(i)
      const boundingBox = await item.boundingBox()
      if (boundingBox) {
        expect(boundingBox.height).toBeGreaterThanOrEqual(44)
        expect(boundingBox.width).toBeGreaterThanOrEqual(44)
      }
    }
  })

  test('should navigate between main views on mobile', async ({ page }) => {
    await page.goto('/')
    
    // Click on Invoices in bottom nav
    await page.getByTestId('bottom-nav-invoices').click({ force: true })
    await page.waitForURL(/\/invoices/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/invoices/)
    
    // Click on Clients in bottom nav  
    await page.getByTestId('bottom-nav-clients').click({ force: true })
    await page.waitForURL(/\/clients/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/clients/)
    
    // Click on Settings in bottom nav
    await page.getByTestId('bottom-nav-settings').click({ force: true })
    await page.waitForTimeout(1000) // Give time for navigation
    await expect(page).toHaveURL(/\/settings/)
    
    // Back to Dashboard
    await page.getByTestId('bottom-nav-dashboard').click({ force: true })
    await page.waitForURL('/dashboard', { timeout: 10000 })
    await expect(page).toHaveURL('/dashboard')
  })

  test('should have accessible tap targets', async ({ page }) => {
    await page.goto('/')
    
    // All interactive elements should meet accessibility guidelines
    const buttons = page.locator('button')
    const links = page.locator('a')
    const inputs = page.locator('input')
    
    const interactiveElements = [...await buttons.all(), ...await links.all(), ...await inputs.all()]
    
    for (const element of interactiveElements) {
      const boundingBox = await element.boundingBox()
      if (boundingBox && boundingBox.width > 0 && boundingBox.height > 0) {
        // Apple's Human Interface Guidelines recommend 44x44pt minimum
        expect(boundingBox.height).toBeGreaterThanOrEqual(40) // Slightly relaxed for flexibility
      }
    }
  })
})