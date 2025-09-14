import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useModalSwipes } from '@/hooks/useSwipeGestures'
import { Button } from './Button'

interface SwipeableModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  position?: 'center' | 'bottom' | 'right'
  showCloseButton?: boolean
  closeOnBackdrop?: boolean
  closeOnSwipe?: boolean
  swipeDirection?: 'up' | 'down' | 'left' | 'right'
  className?: string
}

export function SwipeableModal({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = 'md',
  position = 'center',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnSwipe = true,
  swipeDirection = 'down',
  className
}: SwipeableModalProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  const modalRef = useModalSwipes({
    onClose: closeOnSwipe ? onClose : () => {},
    direction: swipeDirection,
    disabled: !closeOnSwipe
  })

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full'
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'items-end justify-center pb-4'
      case 'right':
        return 'items-center justify-end pr-4'
      case 'center':
      default:
        return 'items-center justify-center'
    }
  }

  const getModalClasses = () => {
    const baseClasses = 'relative bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden transform transition-all duration-300'

    switch (position) {
      case 'bottom':
        return cn(
          baseClasses,
          'w-full rounded-t-lg rounded-b-none',
          isAnimating ? 'translate-y-0' : 'translate-y-full',
          sizeClasses[size]
        )
      case 'right':
        return cn(
          baseClasses,
          'h-full max-h-screen rounded-l-lg rounded-r-none',
          isAnimating ? 'translate-x-0' : 'translate-x-full',
          sizeClasses[size]
        )
      case 'center':
      default:
        return cn(
          baseClasses,
          'w-full',
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
          sizeClasses[size]
        )
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          isAnimating ? 'opacity-100' : 'opacity-0'
        )}
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Modal Container */}
      <div className={cn('flex min-h-screen p-4', getPositionClasses())}>
        <div
          ref={modalRef as any}
          className={cn(getModalClasses(), className)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={description ? 'modal-description' : undefined}
        >
          {/* Header */}
          {(title || description || showCloseButton) && (
            <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-1 min-w-0">
                {title && (
                  <h3
                    id="modal-title"
                    className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                  >
                    {title}
                  </h3>
                )}
                {description && (
                  <p
                    id="modal-description"
                    className="mt-1 text-sm text-gray-600 dark:text-gray-400"
                  >
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}

          {/* Swipe Indicator */}
          {closeOnSwipe && position === 'bottom' && (
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>

          {/* Touch hint */}
          {closeOnSwipe && (
            <div className="sr-only" role="note">
              Swipe {swipeDirection} to close this dialog
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// Bottom sheet variant
export function BottomSheet(props: Omit<SwipeableModalProps, 'position' | 'swipeDirection'>) {
  return (
    <SwipeableModal
      {...props}
      position="bottom"
      swipeDirection="down"
    />
  )
}

// Side drawer variant
export function SideDrawer(props: Omit<SwipeableModalProps, 'position' | 'swipeDirection'>) {
  return (
    <SwipeableModal
      {...props}
      position="right"
      swipeDirection="right"
    />
  )
}

// Hook for managing swipeable modal state
export function useSwipeableModal() {
  const [isOpen, setIsOpen] = useState(false)

  const openModal = () => setIsOpen(true)
  const closeModal = () => setIsOpen(false)
  const toggleModal = () => setIsOpen(prev => !prev)

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal
  }
}