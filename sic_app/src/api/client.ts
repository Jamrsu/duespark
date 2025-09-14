import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { Envelope } from '../types/api'
import { isTokenExpired, storage } from '../lib/utils'
import { retryWithBackoff } from '../utils/retry'
import { displayError } from '../utils/errorHandling'
import { monitoring } from '../utils/monitoring'

class ApiClient {
  private client: AxiosInstance
  private tokenKey = 'auth_token'

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8001',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor for auth token and timing
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getToken()
        if (token && !isTokenExpired(token)) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // Add timestamp for performance tracking
        ;(config as any).metadata = { startTime: Date.now() }

        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor for performance tracking and error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Track API performance
        const config = response.config as any
        if (config.metadata?.startTime) {
          const duration = Date.now() - config.metadata.startTime
          const method = config.method?.toUpperCase() || 'GET'
          const endpoint = config.url || 'unknown'

          monitoring.recordApiMetric(endpoint, method, duration, response.status)
        }

        return response
      },
      (error) => {
        // Track API errors
        const config = error.config as any
        if (config?.metadata?.startTime) {
          const duration = Date.now() - config.metadata.startTime
          const method = config.method?.toUpperCase() || 'GET'
          const endpoint = config.url || 'unknown'
          const status = error.response?.status || 0

          monitoring.recordApiMetric(endpoint, method, duration, status)
        }
        const statusCode = error.response?.status

        // Use standardized error handling
        const context = {
          operation: 'api_request',
          component: 'ApiClient'
        }

        // Handle 401 - token expired or unauthorized
        if (statusCode === 401) {
          this.clearToken()
          // Only redirect to login if we're not already on the auth page
          if (!window.location.pathname.startsWith('/auth')) {
            displayError(error, context)
            window.location.href = '/auth/login'
          }
          return Promise.reject(error)
        }

        // Handle network errors (no response from server)
        if (!error.response) {
          // Don't display toast for network errors since retry logic handles them
          return Promise.reject(error)
        }

        // For validation errors (422), don't show toast automatically
        // Let components handle field-specific validation display
        if (statusCode === 422) {
          return Promise.reject(error)
        }

        // Display standardized error for all other cases
        displayError(error, context)
        return Promise.reject(error)
      }
    )
  }

  // Token management
  setToken(token: string) {
    storage.set(this.tokenKey, token)
  }

  getToken(): string | null {
    return storage.get(this.tokenKey, null)
  }

  clearToken() {
    storage.remove(this.tokenKey)
    // Clear any cached data that might contain user info
    localStorage.removeItem('user_profile')
    sessionStorage.clear()
  }

  clearAllAuthData() {
    // Complete auth cache clearing
    this.clearToken()
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_profile')
    localStorage.removeItem('onboarding_status')
    sessionStorage.clear()

    // Clear any React Query cache if available
    if (window.queryClient) {
      window.queryClient.clear()
    }
  }

  isAuthenticated(): boolean {
    const token = this.getToken()
    return token !== null && !isTokenExpired(token)
  }

  // HTTP methods with proper typing and retry logic
  async get<T>(url: string, params?: Record<string, any>): Promise<Envelope<T>> {
    return await retryWithBackoff(async () => {
      const response = await this.client.get<Envelope<T>>(url, { params })
      return response.data
    })
  }

  async post<T>(
    url: string,
    data?: any,
    options?: { headers?: Record<string, string> }
  ): Promise<Envelope<T>> {
    return await retryWithBackoff(async () => {
      const response = await this.client.post<Envelope<T>>(url, data, options)
      return response.data
    })
  }

  async put<T>(url: string, data?: any): Promise<Envelope<T>> {
    return await retryWithBackoff(async () => {
      const response = await this.client.put<Envelope<T>>(url, data)
      return response.data
    })
  }

  async patch<T>(url: string, data?: any): Promise<Envelope<T>> {
    return await retryWithBackoff(async () => {
      const response = await this.client.patch<Envelope<T>>(url, data)
      return response.data
    })
  }

  async delete<T>(url: string): Promise<Envelope<T>> {
    return await retryWithBackoff(async () => {
      const response = await this.client.delete<Envelope<T>>(url)
      return response.data
    })
  }

  // Form data for file uploads
  async postFormData<T>(url: string, formData: FormData): Promise<Envelope<T>> {
    const response = await this.client.post<Envelope<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  // Form-encoded data for OAuth
  async postForm<T>(url: string, data: Record<string, string>): Promise<Envelope<T>> {
    const formData = new URLSearchParams(data)
    console.log('Login request data:', data)
    console.log('Form data:', formData.toString())
    console.log('Full URL:', `${this.client.defaults.baseURL}${url}`)
    
    try {
      const response = await this.client.post<Envelope<T>>(url, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
      console.log('Login response:', response.data)
      return response.data
    } catch (error) {
      console.error('Login error details:', error)
      if (error instanceof AxiosError && error.response) {
        console.error('Response status:', error.response.status)
        console.error('Response data:', error.response.data)
        console.error('Response headers:', error.response.headers)
      }
      throw error
    }
  }

  // Raw client access for special cases
  getClient(): AxiosInstance {
    return this.client
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient()

// Auth helper hook
export function useAuth() {
  return {
    isAuthenticated: () => apiClient.isAuthenticated(),
    logout: () => {
      apiClient.clearAllAuthData()
      // Force reload to clear any cached components
      window.location.href = '/auth/login'
    },
    getToken: () => apiClient.getToken(),
    clearAllAuthData: () => apiClient.clearAllAuthData(),
  }
}