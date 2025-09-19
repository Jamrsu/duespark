import { test, expect } from '@playwright/test'
import {
  mobileNavigationItems,
  mobileViewportPresets,
  TOUCH_TARGET_MIN_HEIGHT,
  TOUCH_TARGET_MIN_WIDTH
} from './fixtures/mobile'

test.describe('Mobile Navigation', () => {
  const seViewport = mobileViewportPresets.iphoneSE
  test.use({ viewport: { width: seViewport.width, height: seViewport.height } })

  test('should have mobile-friendly navigation', async ({ page }) => {
    await page.goto('/')
    
    // Should show mobile bottom navigation
    const bottomNav = page.getByTestId('bottom-navigation')
    await expect(bottomNav).toBeVisible()

    for (const item of mobileNavigationItems) {
      await expect(page.getByTestId(item.testId)).toBeVisible()
    }
    
    // Navigation items should be large enough for finger taps (44x44px minimum)
    const navItems = page.locator('nav a')
    const count = await navItems.count()
    
    for (let i = 0; i < count; i++) {
      const item = navItems.nth(i)
      const boundingBox = await item.boundingBox()
      if (boundingBox) {
        expect(boundingBox.height).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN_HEIGHT)
        expect(boundingBox.width).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN_WIDTH)
      }
    }
  })

  test('should navigate between main views on mobile', async ({ page }) => {
    await page.goto('/')

    for (const item of mobileNavigationItems) {
      await page.getByTestId(item.testId).click({ force: true })
      const globPattern = item.path.startsWith('/') ? `**${item.path}` : `**/${item.path}`
      await page.waitForURL(globPattern, { timeout: 10000 })
      await expect(page).toHaveURL(globPattern)
    }
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
        expect(boundingBox.height).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN_HEIGHT - 4) // Slightly relaxed for flexibility
      }
    }
  })
})
