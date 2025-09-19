import { test, expect } from '@playwright/test'

test.describe('Critical Mobile Flows', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE size

  test('should handle dashboard view on mobile', async ({ page }) => {
    await page.goto('/')
    
    // Dashboard should load and display KPI cards
    await expect(page.locator('h1')).toContainText('Dashboard')
    
    // KPI cards should be visible and readable on mobile
    const kpiCards = page.locator('[data-testid*="kpi-card"], .space-y-6 > .grid > div')
    await expect(kpiCards.first()).toBeVisible()
    
    // Should have mobile-friendly spacing and layout
    const dashboard = page.locator('main').first()
    await expect(dashboard).toBeVisible()
  })

  test('should handle invoice list and detail navigation', async ({ page }) => {
    await page.goto('/invoices')
    
    // Invoice list should be mobile-friendly
    await expect(page.locator('h1')).toContainText('Invoices')
    
    // Create new invoice button should be accessible
    const newButton = page.locator('button', { hasText: /new|create/i })
    if (await newButton.count() > 0) {
      await expect(newButton.first()).toBeVisible()
      
      const boundingBox = await newButton.first().boundingBox()
      if (boundingBox) {
        expect(boundingBox.height).toBeGreaterThanOrEqual(40)
      }
    }
  })

  test('should handle client management on mobile', async ({ page }) => {
    await page.goto('/clients')
    
    // Client list should load
    await expect(page.locator('h1')).toContainText('Clients')
    
    // Add client button should be mobile-friendly
    const addButton = page.locator('button', { hasText: /new|add/i })
    if (await addButton.count() > 0) {
      const boundingBox = await addButton.first().boundingBox()
      if (boundingBox) {
        expect(boundingBox.height).toBeGreaterThanOrEqual(40)
      }
    }
  })

  test('should handle settings and theme switching', async ({ page }) => {
    await page.goto('/settings')
    
    // Settings should load
    await expect(page.locator('h1')).toContainText('Settings')
    
    // Theme switcher should be present and functional
    const themeSection = page.locator('text=Appearance').locator('..')
    await expect(themeSection).toBeVisible()
    
    // Radio button labels should be large enough for mobile interaction
    const radioLabels = page.locator('label:has(input[type="radio"])')
    const count = await radioLabels.count()
    
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const label = radioLabels.nth(i)
        
        // Label should provide adequate tap target
        const boundingBox = await label.boundingBox()
        if (boundingBox) {
          expect(boundingBox.height).toBeGreaterThanOrEqual(32)
        }
      }
    }
  })

  test('should have one-handed usable bottom navigation', async ({ page }) => {
    await page.goto('/')
    
    // Bottom navigation should be positioned correctly for thumb reach
    const bottomNav = page.locator('.fixed.bottom-0')
    await expect(bottomNav).toBeVisible()
    
    // Should have safe area padding
    await expect(bottomNav).toHaveClass(/safe-area-bottom/)
    
    // Navigation items should be evenly distributed and large enough
    const navItems = bottomNav.locator('a, button')
    const count = await navItems.count()
    
    for (let i = 0; i < count; i++) {
      const item = navItems.nth(i)
      const boundingBox = await item.boundingBox()
      if (boundingBox) {
        // Should be tall enough for comfortable thumb tapping
        expect(boundingBox.height).toBeGreaterThanOrEqual(48)
      }
    }
  })
})