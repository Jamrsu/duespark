/**
 * Utilities for checking and ensuring proper contrast ratios
 * Based on WCAG 2.1 guidelines
 */

// WCAG contrast ratio standards
export const WCAG_STANDARDS = {
  AA_NORMAL: 4.5,     // AA level for normal text (14pt+)
  AA_LARGE: 3,        // AA level for large text (18pt+ or 14pt+ bold)
  AAA_NORMAL: 7,      // AAA level for normal text
  AAA_LARGE: 4.5,     // AAA level for large text
} as const

export type WCAGLevel = 'AA' | 'AAA'
export type TextSize = 'normal' | 'large'

export interface Color {
  r: number
  g: number
  b: number
}

export interface ContrastResult {
  ratio: number
  passes: {
    AA_normal: boolean
    AA_large: boolean
    AAA_normal: boolean
    AAA_large: boolean
  }
  level: 'fail' | 'AA' | 'AAA'
  textSize: TextSize
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): Color | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

/**
 * Convert RGB to relative luminance
 * Based on WCAG 2.1 formula
 */
export function getLuminance(color: Color): number {
  const { r, g, b } = color

  const rsRGB = r / 255
  const gsRGB = g / 255
  const bsRGB = b / 255

  const rLin = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4)
  const gLin = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4)
  const bLin = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4)

  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: Color, color2: Color): number {
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)

  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if contrast ratio meets WCAG standards
 */
export function checkContrast(
  foreground: string,
  background: string,
  textSize: TextSize = 'normal'
): ContrastResult {
  const fgColor = hexToRgb(foreground)
  const bgColor = hexToRgb(background)

  if (!fgColor || !bgColor) {
    throw new Error('Invalid color format. Please use hex colors.')
  }

  const ratio = getContrastRatio(fgColor, bgColor)

  const passes = {
    AA_normal: ratio >= WCAG_STANDARDS.AA_NORMAL,
    AA_large: ratio >= WCAG_STANDARDS.AA_LARGE,
    AAA_normal: ratio >= WCAG_STANDARDS.AAA_NORMAL,
    AAA_large: ratio >= WCAG_STANDARDS.AAA_LARGE,
  }

  let level: ContrastResult['level'] = 'fail'

  if (textSize === 'normal') {
    if (passes.AAA_normal) level = 'AAA'
    else if (passes.AA_normal) level = 'AA'
  } else {
    if (passes.AAA_large) level = 'AAA'
    else if (passes.AA_large) level = 'AA'
  }

  return {
    ratio,
    passes,
    level,
    textSize,
  }
}

/**
 * Get accessible text color (white or black) for a given background
 */
export function getAccessibleTextColor(background: string): string {
  const bgColor = hexToRgb(background)
  if (!bgColor) return '#000000'

  const whiteContrast = getContrastRatio(bgColor, { r: 255, g: 255, b: 255 })
  const blackContrast = getContrastRatio(bgColor, { r: 0, g: 0, b: 0 })

  return whiteContrast > blackContrast ? '#FFFFFF' : '#000000'
}

/**
 * Suggest better color combinations that meet WCAG standards
 */
export function suggestAccessibleColors(
  foreground: string,
  background: string,
  target: WCAGLevel = 'AA',
  textSize: TextSize = 'normal'
): { foreground: string; background: string; ratio: number } | null {
  const targetRatio = target === 'AAA'
    ? (textSize === 'normal' ? WCAG_STANDARDS.AAA_NORMAL : WCAG_STANDARDS.AAA_LARGE)
    : (textSize === 'normal' ? WCAG_STANDARDS.AA_NORMAL : WCAG_STANDARDS.AA_LARGE)

  const current = checkContrast(foreground, background, textSize)
  if (current.ratio >= targetRatio) {
    return { foreground, background, ratio: current.ratio }
  }

  // Try standard high-contrast combinations
  const combinations = [
    { fg: '#000000', bg: '#FFFFFF' },
    { fg: '#FFFFFF', bg: '#000000' },
    { fg: '#2563EB', bg: '#FFFFFF' }, // Blue on white
    { fg: '#FFFFFF', bg: '#1F2937' }, // White on dark gray
    { fg: '#374151', bg: '#F9FAFB' }, // Dark gray on light gray
  ]

  for (const combo of combinations) {
    const result = checkContrast(combo.fg, combo.bg, textSize)
    if (result.ratio >= targetRatio) {
      return { foreground: combo.fg, background: combo.bg, ratio: result.ratio }
    }
  }

  return null
}

/**
 * Validate color palette for accessibility
 */
export function validateColorPalette(palette: Record<string, string>): {
  isValid: boolean
  issues: Array<{
    colors: [string, string]
    ratio: number
    issue: string
  }>
  suggestions: Array<{
    original: [string, string]
    suggested: [string, string]
    improvement: number
  }>
} {
  const issues: ReturnType<typeof validateColorPalette>['issues'] = []
  const suggestions: ReturnType<typeof validateColorPalette>['suggestions'] = []

  // Common color combinations to check
  const combinations = [
    ['text', 'background'],
    ['primary', 'background'],
    ['secondary', 'background'],
    ['error', 'background'],
    ['success', 'background'],
    ['warning', 'background'],
  ]

  combinations.forEach(([fg, bg]) => {
    if (palette[fg] && palette[bg]) {
      const result = checkContrast(palette[fg], palette[bg])

      if (result.level === 'fail') {
        issues.push({
          colors: [palette[fg], palette[bg]],
          ratio: result.ratio,
          issue: `${fg} on ${bg} has insufficient contrast (${result.ratio.toFixed(2)}:1)`
        })

        const suggestion = suggestAccessibleColors(palette[fg], palette[bg])
        if (suggestion) {
          suggestions.push({
            original: [palette[fg], palette[bg]],
            suggested: [suggestion.foreground, suggestion.background],
            improvement: suggestion.ratio - result.ratio
          })
        }
      }
    }
  })

  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  }
}

/**
 * Development-only contrast checker
 * Logs contrast issues in the console
 */
let lastAuditSignature = ''

export function auditPageContrast(): void {
  if (process.env.NODE_ENV !== 'development') return

  const elements = document.querySelectorAll('*')
  const issues: Array<{ element: Element; fg: string; bg: string; ratio: number }> = []

  elements.forEach(element => {
    const styles = window.getComputedStyle(element)
    const color = styles.color
    const backgroundColor = styles.backgroundColor

    if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
      // Convert computed styles to hex (simplified)
      const fgHex = rgbToHex(color)
      const bgHex = rgbToHex(backgroundColor)

      if (fgHex && bgHex) {
        const result = checkContrast(fgHex, bgHex)
        if (result.level === 'fail') {
          issues.push({
            element,
            fg: fgHex,
            bg: bgHex,
            ratio: result.ratio
          })
        }
      }
    }
  })

  const signature = JSON.stringify(
    issues.map(({ fg, bg, ratio, element }) => ({
      fg,
      bg,
      ratio: Number(ratio.toFixed(2)),
      tag: element.tagName,
    }))
  )

  if (signature !== lastAuditSignature) {
    lastAuditSignature = signature

    console.group('🎨 Contrast Audit')

    if (issues.length > 0) {
      console.warn(`Found ${issues.length} contrast issues:`)
      issues.forEach(({ element, fg, bg, ratio }) => {
        console.warn(`${element.tagName}: ${fg} on ${bg} (${ratio.toFixed(2)}:1)`, element)
      })
    } else {
      console.log('✅ No contrast issues found')
    }

    console.groupEnd()
  }
}

/**
 * Convert RGB string to hex (simplified)
 */
function rgbToHex(rgb: string): string | null {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (!match) return null

  const r = parseInt(match[1], 10)
  const g = parseInt(match[2], 10)
  const b = parseInt(match[3], 10)

  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}
