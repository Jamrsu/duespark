import { z } from 'zod'

// Environment variable schema with validation
const envSchema = z.object({
  MODE: z.enum(['development', 'production', 'test']).default('development'),
  VITE_API_BASE_URL: z.string().url().optional().default('http://localhost:8000'),
  VITE_APP_NAME: z.string().default('SIC App'),
  VITE_APP_VERSION: z.string().optional(),
  VITE_ENABLE_DEV_TOOLS: z.string().transform(val => val === 'true').default('true'),
  VITE_SENTRY_DSN: z.string().optional(),
  VITE_ANALYTICS_ID: z.string().optional(),
  VITE_ENABLE_ANALYTICS: z.string().transform(val => val === 'true').default('false'),
})

// Validate and parse environment variables
function validateEnv() {
  try {
    const env = envSchema.parse({
      MODE: import.meta.env.MODE,
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
      VITE_APP_VERSION: import.meta.env.VITE_APP_VERSION,
      VITE_ENABLE_DEV_TOOLS: import.meta.env.VITE_ENABLE_DEV_TOOLS,
      VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
      VITE_ANALYTICS_ID: import.meta.env.VITE_ANALYTICS_ID,
      VITE_ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS,
    })

    return env
  } catch (error) {
    console.error('❌ Invalid environment variables:', error)
    throw new Error('Invalid environment configuration')
  }
}

// Export validated environment variables
export const env = validateEnv()

// Helper functions for common environment checks
export const isDevelopment = env.MODE === 'development'
export const isProduction = env.MODE === 'production'
export const isTest = env.MODE === 'test'

// Feature flags based on environment
export const features = {
  devTools: isDevelopment && env.VITE_ENABLE_DEV_TOOLS,
  analytics: env.VITE_ENABLE_ANALYTICS && !!env.VITE_ANALYTICS_ID,
  errorReporting: !!env.VITE_SENTRY_DSN,
} as const

// Runtime configuration
export const config = {
  app: {
    name: env.VITE_APP_NAME,
    version: env.VITE_APP_VERSION || '0.1.0',
    isDevelopment,
    isProduction,
    isTest,
  },
  api: {
    baseUrl: env.VITE_API_BASE_URL,
    timeout: 30000,
  },
  features,
} as const

// Type-safe environment access
export type Env = typeof env
export type Config = typeof config
export type Features = typeof features

// Development-only environment info
if (isDevelopment) {
  console.log('🚀 Environment Configuration:', {
    mode: env.MODE,
    apiUrl: env.VITE_API_BASE_URL,
    features: features,
  })
}