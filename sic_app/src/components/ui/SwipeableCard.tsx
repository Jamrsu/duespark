import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Eye, Trash2, Edit, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeAction {
  id: string
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
  action: () => void
}

interface SwipeableCardProps {
  children: React.ReactNode
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  onSwipe?: (direction: 'left' | 'right', actionId: string) => void
  className?: string
  disabled?: boolean
  swipeThreshold?: number
}

export function SwipeableCard({
  children,
  leftActions = [],
  rightActions = [],
  onSwipe,
  className,
  disabled = false,
  swipeThreshold = 80
}: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [actionTriggered, setActionTriggered] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')

  const cardRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number>(0)

  // Haptic feedback (if available)
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      }
      navigator.vibrate(patterns[type])
    }
  }, [])

  // Show action feedback
  const showActionFeedback = useCallback((text: string) => {
    setFeedbackText(text)
    setShowFeedback(true)
    setTimeout(() => setShowFeedback(false), 1500)
  }, [])

  // Reset position
  const resetPosition = () => {
    setTranslateX(0)
    setIsDragging(false)
    setActionTriggered(null)
  }

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return

    const touch = e.touches[0]
    setDragStartX(touch.clientX)
    setIsDragging(true)
    startTimeRef.current = Date.now()
  }

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || disabled) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - dragStartX
    const maxSwipe = 120

    // Limit swipe distance and add resistance
    let newTranslateX = deltaX
    if (Math.abs(deltaX) > maxSwipe) {
      const resistance = 0.3
      const excess = Math.abs(deltaX) - maxSwipe
      newTranslateX = deltaX > 0
        ? maxSwipe + excess * resistance
        : -maxSwipe - excess * resistance
    }

    setTranslateX(newTranslateX)

    // Determine which action would be triggered
    if (Math.abs(newTranslateX) > swipeThreshold) {
      const actions = newTranslateX > 0 ? leftActions : rightActions
      if (actions.length > 0 && actionTriggered !== actions[0].id) {
        setActionTriggered(actions[0].id)
        triggerHapticFeedback('light')
      }
    } else {
      if (actionTriggered) {
        setActionTriggered(null)
      }
    }
  }

  // Handle touch end
  const handleTouchEnd = () => {
    if (!isDragging || disabled) return

    const swipeTime = Date.now() - startTimeRef.current
    const isQuickSwipe = swipeTime < 300 && Math.abs(translateX) > 40

    // Trigger action if threshold met or quick swipe
    if ((Math.abs(translateX) > swipeThreshold || isQuickSwipe) && actionTriggered) {
      const direction = translateX > 0 ? 'left' : 'right'
      const actions = direction === 'left' ? leftActions : rightActions

      if (actions.length > 0) {
        triggerHapticFeedback('medium')
        showActionFeedback(`${actions[0].label} action triggered`)
        actions[0].action()
        onSwipe?.(direction, actions[0].id)
      }
    }

    resetPosition()
  }

  // Handle mouse events for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return

    setDragStartX(e.clientX)
    setIsDragging(true)
    startTimeRef.current = Date.now()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || disabled) return

    const deltaX = e.clientX - dragStartX
    const maxSwipe = 120

    let newTranslateX = deltaX
    if (Math.abs(deltaX) > maxSwipe) {
      const resistance = 0.3
      const excess = Math.abs(deltaX) - maxSwipe
      newTranslateX = deltaX > 0
        ? maxSwipe + excess * resistance
        : -maxSwipe - excess * resistance
    }

    setTranslateX(newTranslateX)

    if (Math.abs(newTranslateX) > swipeThreshold) {
      const actions = newTranslateX > 0 ? leftActions : rightActions
      if (actions.length > 0 && actionTriggered !== actions[0].id) {
        setActionTriggered(actions[0].id)
        triggerHapticFeedback('light')
      }
    } else {
      if (actionTriggered) {
        setActionTriggered(null)
      }
    }
  }

  const handleMouseUp = () => {
    if (!isDragging || disabled) return

    const swipeTime = Date.now() - startTimeRef.current
    const isQuickSwipe = swipeTime < 300 && Math.abs(translateX) > 40

    if ((Math.abs(translateX) > swipeThreshold || isQuickSwipe) && actionTriggered) {
      const direction = translateX > 0 ? 'left' : 'right'
      const actions = direction === 'left' ? leftActions : rightActions

      if (actions.length > 0) {
        actions[0].action()
        onSwipe?.(direction, actions[0].id)
      }
    }

    resetPosition()
  }

  // Add mouse event listeners for desktop
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!isDragging || disabled) return

        const deltaX = e.clientX - dragStartX
        const maxSwipe = 120

        let newTranslateX = deltaX
        if (Math.abs(deltaX) > maxSwipe) {
          const resistance = 0.3
          const excess = Math.abs(deltaX) - maxSwipe
          newTranslateX = deltaX > 0
            ? maxSwipe + excess * resistance
            : -maxSwipe - excess * resistance
        }

        setTranslateX(newTranslateX)

        if (Math.abs(newTranslateX) > swipeThreshold) {
          const actions = newTranslateX > 0 ? leftActions : rightActions
          if (actions.length > 0) {
            setActionTriggered(actions[0].id)
          }
        } else {
          setActionTriggered(null)
        }
      }

      const handleGlobalMouseUp = () => {
        handleMouseUp()
      }

      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [isDragging, dragStartX, disabled, swipeThreshold, leftActions, rightActions, actionTriggered, triggerHapticFeedback])

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Action feedback toast */}
      {showFeedback && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-3 py-1 rounded-full text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          {feedbackText}
        </div>
      )}
      {/* Background actions - Left */}
      {leftActions.length > 0 && (
        <div
          className={cn(
            'absolute left-0 top-0 h-full flex items-center',
            'transition-all duration-200',
            translateX > 0 ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            width: Math.max(0, translateX),
            background: leftActions[0].bgColor
          }}
        >
          <div className="flex items-center justify-center w-full h-full">
            <div className={cn(
              'flex flex-col items-center gap-1 transition-all duration-200',
              actionTriggered === leftActions[0].id
                ? 'scale-110 animate-pulse'
                : 'scale-100'
            )}>
              <div className={leftActions[0].color}>
                {leftActions[0].icon}
              </div>
              <span className={cn(
                'text-xs font-medium',
                leftActions[0].color
              )}>
                {leftActions[0].label}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Background actions - Right */}
      {rightActions.length > 0 && (
        <div
          className={cn(
            'absolute right-0 top-0 h-full flex items-center',
            'transition-all duration-200',
            translateX < 0 ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            width: Math.max(0, -translateX),
            background: rightActions[0].bgColor
          }}
        >
          <div className="flex items-center justify-center w-full h-full">
            <div className={cn(
              'flex flex-col items-center gap-1 transition-all duration-200',
              actionTriggered === rightActions[0].id
                ? 'scale-110 animate-pulse'
                : 'scale-100'
            )}>
              <div className={rightActions[0].color}>
                {rightActions[0].icon}
              </div>
              <span className={cn(
                'text-xs font-medium',
                rightActions[0].color
              )}>
                {rightActions[0].label}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main card content */}
      <div
        ref={cardRef}
        className={cn(
          'relative bg-white dark:bg-gray-800',
          'transition-transform duration-200 ease-out',
          isDragging ? 'duration-0' : '',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-grab active:cursor-grabbing',
          className
        )}
        style={{
          transform: `translateX(${translateX}px)`,
          zIndex: 1
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {/* Swipe hint indicators */}
        {!disabled && (
          <>
            {leftActions.length > 0 && translateX > 10 && (
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-50">
                <div className="w-1 h-8 bg-current rounded-full" />
              </div>
            )}
            {rightActions.length > 0 && translateX < -10 && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-50">
                <div className="w-1 h-8 bg-current rounded-full" />
              </div>
            )}
          </>
        )}

        {children}
      </div>
    </div>
  )
}

// Preset action configurations
export const swipeActions = {
  remind: {
    id: 'remind',
    label: 'Remind',
    icon: <Send className="w-5 h-5" />,
    color: 'text-blue-600',
    bgColor: 'linear-gradient(90deg, #dbeafe 0%, #bfdbfe 100%)'
  },
  view: {
    id: 'view',
    label: 'View',
    icon: <Eye className="w-5 h-5" />,
    color: 'text-green-600',
    bgColor: 'linear-gradient(90deg, #dcfce7 0%, #bbf7d0 100%)'
  },
  edit: {
    id: 'edit',
    label: 'Edit',
    icon: <Edit className="w-5 h-5" />,
    color: 'text-yellow-600',
    bgColor: 'linear-gradient(90deg, #fef3c7 0%, #fde68a 100%)'
  },
  delete: {
    id: 'delete',
    label: 'Delete',
    icon: <Trash2 className="w-5 h-5" />,
    color: 'text-red-600',
    bgColor: 'linear-gradient(90deg, #fee2e2 0%, #fecaca 100%)'
  },
  markPaid: {
    id: 'markPaid',
    label: 'Mark Paid',
    icon: <Check className="w-5 h-5" />,
    color: 'text-green-600',
    bgColor: 'linear-gradient(90deg, #dcfce7 0%, #bbf7d0 100%)'
  }
}