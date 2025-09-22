/**
 * Skip Navigation Component
 * Provides keyboard users with quick navigation options
 */

import React from 'react'
import { cn } from '@/lib/utils'

interface SkipLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only',
        'absolute top-4 left-4 z-50',
        'bg-primary-700 text-white px-4 py-2 rounded-lg',
        'font-medium text-sm',
        'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-700',
        'transition-all duration-200',
        className
      )}
      onClick={(e) => {
        e.preventDefault()
        const target = document.querySelector(href)
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
          // Focus the target if it's focusable, otherwise focus the first focusable element within
          if (target instanceof HTMLElement) {
            if (target.hasAttribute('tabindex') || target.tagName.match(/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/)) {
              target.focus()
            } else {
              const focusable = target.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
              if (focusable instanceof HTMLElement) {
                focusable.focus()
              }
            }
          }
        }
      }}
    >
      {children}
    </a>
  )
}

export function SkipNavigation() {
  return (
    <div className="skip-navigation">
      <SkipLink href="#main-content">
        Skip to main content
      </SkipLink>
      <SkipLink href="#main-navigation" className="top-16">
        Skip to navigation
      </SkipLink>
    </div>
  )
}