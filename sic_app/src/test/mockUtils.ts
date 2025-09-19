import { Envelope, User } from '../types/api'

/**
 * Creates a properly formatted mock API response envelope
 */
export function createMockEnvelope<T>(data: T): Envelope<T> {
  return {
    success: true,
    data,
    meta: {}
  }
}

/**
 * Creates a mock error response envelope
 */
export function createMockErrorEnvelope(error: string): Envelope<null> {
  return {
    success: false,
    data: null,
    meta: { error }
  }
}

/**
 * Creates a mock User object with all required properties
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'test@example.com',
    email_verified: true,
    onboarding_status: 'completed',
    payment_method: null,
    stripe_account_id: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    ...overrides
  }
}