import { test as setup } from '@playwright/test'

setup('authenticate', async ({ page }) => {
  // Go to login page
  await page.goto('/login')
  
  // Fill in demo credentials
  await page.fill('input[name="email"]', 'demo@example.com')
  await page.fill('input[name="password"]', 'demo123')
  
  // Click login button
  await page.click('button[type="submit"]')
  
  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard')
  
  // Save authentication state
  await page.context().storageState({ path: 'e2e/auth.json' })
})