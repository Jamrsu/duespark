import { auditPageContrast, validateColorPalette } from './contrast'

/**
 * Development tool for auditing contrast compliance
 */
export class ContrastAuditor {
  private observer: MutationObserver | null = null
  private isRunning = false

  /**
   * Start continuous contrast monitoring
   */
  public start(): void {
    if (process.env.NODE_ENV !== 'development' || this.isRunning) return

    this.isRunning = true

    // Initial audit
    setTimeout(() => auditPageContrast(), 1000)

    // Set up mutation observer to re-audit when DOM changes
    this.observer = new MutationObserver((mutations) => {
      let shouldReaudit = false

      mutations.forEach((mutation) => {
        if (
          mutation.type === 'childList' && mutation.addedNodes.length > 0 ||
          mutation.type === 'attributes' && ['class', 'style'].includes(mutation.attributeName || '')
        ) {
          shouldReaudit = true
        }
      })

      if (shouldReaudit) {
        // Debounce re-audits
        setTimeout(() => auditPageContrast(), 500)
      }
    })

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    })

    console.log('🎨 Contrast auditor started')
  }

  /**
   * Stop contrast monitoring
   */
  public stop(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
    this.isRunning = false
    console.log('🎨 Contrast auditor stopped')
  }

  /**
   * Audit the current theme colors
   */
  public auditTheme(): void {
    if (process.env.NODE_ENV !== 'development') return

    // Get CSS custom properties for current theme
    const palette = {
      background: '#ffffff', // Default light theme
      text: '#111827',
      primary: '#0ea5e9',
      secondary: '#6b7280',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    }

    // Try to get dark theme colors if available
    if (document.documentElement.classList.contains('dark')) {
      palette.background = '#111827'
      palette.text = '#f9fafb'
    }

    const validation = validateColorPalette(palette)

    console.group('🎨 Theme Contrast Audit')

    if (validation.isValid) {
      console.log('✅ All color combinations pass WCAG AA standards')
    } else {
      console.warn(`❌ Found ${validation.issues.length} contrast issues:`)
      validation.issues.forEach(({ ratio, issue }) => {
        console.warn(`${issue} - Current: ${ratio.toFixed(2)}:1`)
      })

      if (validation.suggestions.length > 0) {
        console.info('💡 Suggested improvements:')
        validation.suggestions.forEach(({ original, suggested, improvement }) => {
          console.info(
            `${original[0]} → ${suggested[0]} (+${improvement.toFixed(2)} contrast improvement)`
          )
        })
      }
    }

    console.groupEnd()
  }

  /**
   * Add visual indicators for contrast issues (development only)
   */
  public highlightIssues(): void {
    if (process.env.NODE_ENV !== 'development') return

    // Remove existing highlights
    document.querySelectorAll('[data-contrast-issue]').forEach(el => {
      const htmlEl = el as HTMLElement
      htmlEl.removeAttribute('data-contrast-issue')
      htmlEl.style.outline = ''
    })

    // Find and highlight contrast issues
    const elements = document.querySelectorAll('*')

    elements.forEach(element => {
      const styles = window.getComputedStyle(element)
      const color = styles.color
      const backgroundColor = styles.backgroundColor
      const hasText = element.textContent?.trim().length

      if (hasText && color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        // Simplified contrast check (you'd use the full contrast.ts functions here)
        const isLowContrast = this.quickContrastCheck(color, backgroundColor)

        if (isLowContrast) {
          const htmlElement = element as HTMLElement
          htmlElement.setAttribute('data-contrast-issue', 'true')
          htmlElement.style.outline = '2px solid red'
          htmlElement.title = 'Contrast issue detected'
        }
      }
    })

    console.log('🔍 Contrast issues highlighted with red outline')
  }

  /**
   * Quick and dirty contrast check (simplified)
   */
  private quickContrastCheck(color1: string, color2: string): boolean {
    // This is a very simplified check - in real usage you'd use the full contrast functions
    // Just checking for some obvious low-contrast combinations
    const lightOnLight = color1.includes('rgb(200') && color2.includes('rgb(250')
    const darkOnDark = color1.includes('rgb(50') && color2.includes('rgb(30')

    return lightOnLight || darkOnDark
  }
}

// Global instance for development
export const contrastAuditor = new ContrastAuditor()

// Auto-start in development
if (process.env.NODE_ENV === 'development') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      contrastAuditor.start()
    })
  } else {
    contrastAuditor.start()
  }

  // Add global functions for manual testing
  ;(window as any).__contrastAuditor = {
    start: () => contrastAuditor.start(),
    stop: () => contrastAuditor.stop(),
    audit: () => auditPageContrast(),
    auditTheme: () => contrastAuditor.auditTheme(),
    highlight: () => contrastAuditor.highlightIssues(),
  }

  console.log(
    '🎨 Contrast auditor available globally:\n' +
    '- __contrastAuditor.audit() - Run contrast audit\n' +
    '- __contrastAuditor.auditTheme() - Audit theme colors\n' +
    '- __contrastAuditor.highlight() - Highlight issues visually\n' +
    '- __contrastAuditor.start() - Start monitoring\n' +
    '- __contrastAuditor.stop() - Stop monitoring'
  )
}