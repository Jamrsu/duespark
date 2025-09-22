import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AmbientBackgroundProps {
  theme: 'light' | 'dark'
  className?: string
  variant?: 'default' | 'subtle'
  animated?: boolean
}

export function AmbientBackground({ theme, className, variant = 'default', animated = false }: AmbientBackgroundProps) {
  const baseGradient = theme === 'dark'
    ? 'from-purple-950/60 via-blue-950/40 to-indigo-950/60'
    : 'from-purple-100/70 via-blue-100/70 to-indigo-100/70'

  const bubbleOpacity = variant === 'subtle' ? 0.08 : 0.12
  const bubbleScale = variant === 'subtle' ? 0.95 : 1

  const bubbles = [
    { className: 'top-[-10%] left-1/4', delay: 0 },
    { className: 'top-1/2 right-1/4', delay: 2 },
    { className: 'bottom-[-10%] left-1/3', delay: 4 },
  ]

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br transition-colors duration-700 ease-out',
          baseGradient,
          variant === 'subtle' ? 'opacity-60' : 'opacity-90'
        )}
      />

      {bubbles.map((bubble, index) => (
        <motion.div
          key={index}
          className={cn(
            'absolute w-[28rem] h-[28rem] rounded-full mix-blend-overlay blur-3xl transition-colors duration-700',
            theme === 'dark' ? 'bg-purple-600' : 'bg-purple-200',
            bubble.className
          )}
          style={{ opacity: bubbleOpacity }}
          animate={animated ? {
            y: [0, -25, 0],
            scale: [bubbleScale, bubbleScale + 0.05, bubbleScale],
          } : {}}
          transition={animated ? {
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: bubble.delay,
          } : {}}
        />
      ))}
    </div>
  )
}
