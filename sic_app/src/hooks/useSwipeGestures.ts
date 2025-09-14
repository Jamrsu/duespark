import React, { useEffect, useCallback, useRef } from 'react'

export interface SwipeOptions {
  threshold?: number
  velocityThreshold?: number
  preventScroll?: boolean
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  disabled?: boolean
}

export interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down' | null
  distance: number
  velocity: number
  duration: number
}

interface TouchInfo {
  startX: number
  startY: number
  startTime: number
  currentX: number
  currentY: number
}

export function useSwipeGestures(options: SwipeOptions = {}) {
  const {
    threshold = 50,
    velocityThreshold = 0.3,
    preventScroll = false,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    disabled = false
  } = options

  const touchInfo = useRef<TouchInfo | null>(null)
  const gestureRef = useRef<HTMLElement>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return

    const touch = e.touches[0]
    if (!touch) return

    touchInfo.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      currentX: touch.clientX,
      currentY: touch.clientY
    }

    if (preventScroll) {
      e.preventDefault()
    }
  }, [disabled, preventScroll])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || !touchInfo.current) return

    const touch = e.touches[0]
    if (!touch) return

    touchInfo.current.currentX = touch.clientX
    touchInfo.current.currentY = touch.clientY

    if (preventScroll) {
      e.preventDefault()
    }
  }, [disabled, preventScroll])

  const handleTouchEnd = useCallback((_e: TouchEvent) => {
    if (disabled || !touchInfo.current) return

    const { startX, startY, startTime, currentX, currentY } = touchInfo.current
    const deltaX = currentX - startX
    const deltaY = currentY - startY
    const duration = Date.now() - startTime
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const velocity = distance / duration

    // Determine swipe direction
    let direction: SwipeGesture['direction'] = null

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) >= threshold) {
        direction = deltaX > 0 ? 'right' : 'left'
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) >= threshold) {
        direction = deltaY > 0 ? 'down' : 'up'
      }
    }

    // Execute callbacks if thresholds are met
    if (direction && velocity >= velocityThreshold) {
      switch (direction) {
        case 'left':
          onSwipeLeft?.()
          break
        case 'right':
          onSwipeRight?.()
          break
        case 'up':
          onSwipeUp?.()
          break
        case 'down':
          onSwipeDown?.()
          break
      }
    }

    touchInfo.current = null
  }, [disabled, threshold, velocityThreshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  useEffect(() => {
    const element = gestureRef.current
    if (!element) return

    const options = { passive: !preventScroll }

    element.addEventListener('touchstart', handleTouchStart, options)
    element.addEventListener('touchmove', handleTouchMove, options)
    element.addEventListener('touchend', handleTouchEnd, options)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventScroll])

  return gestureRef
}

// Hook for navigation-specific swipe gestures
export function useNavigationSwipes({
  onNavigateBack,
  onNavigateForward,
  onOpenMenu,
  onCloseMenu,
  disabled = false
}: {
  onNavigateBack?: () => void
  onNavigateForward?: () => void
  onOpenMenu?: () => void
  onCloseMenu?: () => void
  disabled?: boolean
}) {
  return useSwipeGestures({
    onSwipeRight: onNavigateBack,
    onSwipeLeft: onNavigateForward,
    onSwipeDown: onOpenMenu,
    onSwipeUp: onCloseMenu,
    threshold: 100, // Larger threshold for navigation
    velocityThreshold: 0.5,
    disabled
  })
}

// Hook for modal/drawer swipe gestures
export function useModalSwipes({
  onClose,
  direction = 'down',
  disabled = false
}: {
  onClose: () => void
  direction?: 'up' | 'down' | 'left' | 'right'
  disabled?: boolean
}) {
  const swipeHandlers = {
    up: undefined as (() => void) | undefined,
    down: undefined as (() => void) | undefined,
    left: undefined as (() => void) | undefined,
    right: undefined as (() => void) | undefined,
  }

  swipeHandlers[direction] = onClose

  return useSwipeGestures({
    onSwipeUp: swipeHandlers.up,
    onSwipeDown: swipeHandlers.down,
    onSwipeLeft: swipeHandlers.left,
    onSwipeRight: swipeHandlers.right,
    threshold: 80,
    velocityThreshold: 0.4,
    disabled
  })
}

// Hook for carousel/slider swipe gestures
export function useCarouselSwipes({
  onNext,
  onPrevious,
  disabled = false
}: {
  onNext: () => void
  onPrevious: () => void
  disabled?: boolean
}) {
  return useSwipeGestures({
    onSwipeLeft: onNext,
    onSwipeRight: onPrevious,
    threshold: 60,
    velocityThreshold: 0.3,
    preventScroll: true,
    disabled
  })
}

// Utility function to check if device supports touch
export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator.msMaxTouchPoints > 0
  )
}

// Component wrapper for swipe gestures

export interface SwipeWrapperProps extends React.HTMLAttributes<HTMLDivElement>, SwipeOptions {
  children: React.ReactNode
  as?: keyof JSX.IntrinsicElements
}

export function SwipeWrapper({
  children,
  as: Component = 'div',
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold,
  velocityThreshold,
  preventScroll,
  disabled,
  ...props
}: SwipeWrapperProps) {
  const ref = useSwipeGestures({
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold,
    velocityThreshold,
    preventScroll,
    disabled
  })

  return React.createElement(Component, { ref, ...props }, children)
}