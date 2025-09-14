import React, { useState } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  fallback?: string
  priority?: boolean
  sizes?: string
  quality?: number
}

export function OptimizedImage({
  src,
  alt,
  fallback = '/assets/placeholder.svg',
  priority = false,
  sizes = '100vw',
  quality = 85,
  className,
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false)
    onLoad?.(event)
  }

  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true)
    setIsLoading(false)
    setCurrentSrc(fallback)
    onError?.(event)
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      )}
      <img
        src={currentSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        {...props}
      />
    </div>
  )
}

interface ResponsiveImageProps extends Omit<OptimizedImageProps, 'src'> {
  baseSrc: string
  breakpoints?: {
    sm?: string
    md?: string
    lg?: string
    xl?: string
  }
}

export function ResponsiveImage({
  baseSrc,
  breakpoints = {},
  alt,
  className,
  ...props
}: ResponsiveImageProps) {
  const generateSrcSet = () => {
    const srcSet = []

    if (breakpoints.sm) srcSet.push(`${breakpoints.sm} 640w`)
    if (breakpoints.md) srcSet.push(`${breakpoints.md} 768w`)
    if (breakpoints.lg) srcSet.push(`${breakpoints.lg} 1024w`)
    if (breakpoints.xl) srcSet.push(`${breakpoints.xl} 1280w`)

    return srcSet.length > 0 ? srcSet.join(', ') : undefined
  }

  const srcSet = generateSrcSet()

  return (
    <OptimizedImage
      src={baseSrc}
      srcSet={srcSet}
      alt={alt}
      className={className}
      {...props}
    />
  )
}