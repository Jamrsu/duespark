import { useState, useEffect } from 'react'

/**
 * Hook that tracks a CSS media query and returns whether it matches
 * @param query - The media query string (e.g., '(max-width: 768px)')
 * @returns boolean - true if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Use the newer addEventListener if available, fallback to deprecated addListener
    if (media.addEventListener) {
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    } else {
      // Fallback for older browsers
      media.addListener(listener)
      return () => media.removeListener(listener)
    }
  }, [matches, query])

  return matches
}

/**
 * Hook that returns whether the current screen size is mobile (768px or smaller)
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)')
}

/**
 * Hook that returns whether the current screen size is tablet (1024px or smaller)
 */
export function useIsTablet(): boolean {
  return useMediaQuery('(max-width: 1024px)')
}

/**
 * Hook that returns the current breakpoint
 */
export function useBreakpoint() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  if (isMobile) return 'mobile'
  if (isTablet) return 'tablet'
  return 'desktop'
}