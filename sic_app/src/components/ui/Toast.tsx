import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastProps extends Toast {
  onRemove: (id: string) => void
}

function Toast({ id, type, title, description, duration = 5000, action, onRemove }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    setTimeout(() => setIsVisible(true), 10)

    if (duration > 0) {
      const timer = setTimeout(() => {
        handleRemove()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration])

  const handleRemove = () => {
    setIsRemoving(true)
    setTimeout(() => {
      onRemove(id)
    }, 200)
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getStyleClasses = () => {
    const baseClasses = 'relative w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg border overflow-hidden'

    switch (type) {
      case 'success':
        return cn(baseClasses, 'border-green-200 dark:border-green-800')
      case 'error':
        return cn(baseClasses, 'border-red-200 dark:border-red-800')
      case 'warning':
        return cn(baseClasses, 'border-yellow-200 dark:border-yellow-800')
      case 'info':
        return cn(baseClasses, 'border-blue-200 dark:border-blue-800')
    }
  }

  return (
    <div
      className={cn(
        'transform transition-all duration-200 ease-out',
        isVisible && !isRemoving
          ? 'translate-x-0 opacity-100 scale-100'
          : 'translate-x-full opacity-0 scale-95',
        isRemoving && '-translate-x-full'
      )}
      role="alert"
      aria-live="polite"
    >
      <div className={getStyleClasses()}>
        {/* Progress bar for timed toasts */}
        {duration > 0 && (
          <div
            className={cn(
              'absolute top-0 left-0 h-1 bg-current animate-[shrink_5s_linear_forwards]',
              type === 'success' && 'text-green-500',
              type === 'error' && 'text-red-500',
              type === 'warning' && 'text-yellow-500',
              type === 'info' && 'text-blue-500'
            )}
          />
        )}

        <div className="p-4">
          <div className="flex items-start gap-3">
            {getIcon()}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {title}
              </div>
              {description && (
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {description}
                </div>
              )}
              {action && (
                <div className="mt-3">
                  <button
                    onClick={action.onClick}
                    className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                  >
                    {action.label}
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleRemove}
              className="flex-shrink-0 ml-2 p-1 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (!toasts.length) return null

  return createPortal(
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onRemove={onRemove} />
        </div>
      ))}
    </div>,
    document.body
  )
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { ...toast, id }])
    return id
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const removeAllToasts = () => {
    setToasts([])
  }

  const success = (title: string, description?: string) =>
    addToast({ type: 'success', title, description })

  const error = (title: string, description?: string) =>
    addToast({ type: 'error', title, description, duration: 0 })

  const warning = (title: string, description?: string) =>
    addToast({ type: 'warning', title, description })

  const info = (title: string, description?: string) =>
    addToast({ type: 'info', title, description })

  return {
    toasts,
    addToast,
    removeToast,
    removeAllToasts,
    success,
    error,
    warning,
    info
  }
}