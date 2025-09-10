
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import type { Envelope } from '../types/api'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:8000'
})

// Optional helpers to work with the { data, meta } envelope
export const unwrap = async <T = unknown>(p: Promise<AxiosResponse<Envelope<T>>>): Promise<T> => {
  const res = await p
  return res.data.data
}

export const request = async <T = unknown>(config: AxiosRequestConfig): Promise<Envelope<T>> => {
  const res = await api.request<Envelope<T>>(config)
  return res.data
}

// Attach Authorization if token present
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers = config.headers || {}
      ;(config.headers as any)['Authorization'] = `Bearer ${token}`
    }
  } catch {}
  return config
})

// Normalize error messages from API responses
api.interceptors.response.use(
  (res) => res,
  (error) => {
    let message = 'Request failed'
    try {
      if (error.response) {
        const data = error.response.data
        message = data?.detail || data?.message || data?.meta?.message || error.message
      } else if (error.request) {
        message = 'No response from server'
      } else if (error.message) {
        message = error.message
      }
    } catch {}
    return Promise.reject(new Error(message))
  }
)
