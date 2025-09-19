/**
 * Test fixtures for user data
 */

export interface TestUser {
  id?: number
  email: string
  password: string
  role: 'owner' | 'member' | 'admin'
  email_verified?: boolean
  onboarding_status?: 'not_started' | 'account_created' | 'email_verified' | 'payment_configured' | 'completed'
  stripe_account_id?: string
  payment_method?: 'stripe' | 'manual'
  created_at?: string
  updated_at?: string
}

export interface TestRegistration {
  email: string
  password: string
  confirmPassword: string
}

export const testUsers: Record<string, TestUser> = {
  newUser: {
    email: 'newuser@test.com',
    password: 'TestPassword123!',
    role: 'owner',
    email_verified: false,
    onboarding_status: 'not_started'
  },

  verifiedUser: {
    email: 'verified@test.com',
    password: 'TestPassword123!',
    role: 'owner',
    email_verified: true,
    onboarding_status: 'email_verified'
  },

  completeUser: {
    email: 'complete@test.com',
    password: 'TestPassword123!',
    role: 'owner',
    email_verified: true,
    onboarding_status: 'completed',
    stripe_account_id: 'acct_test123',
    payment_method: 'stripe'
  }
}

export const testRegistrations: Record<string, TestRegistration> = {
  valid: {
    email: 'newuser@test.com',
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!'
  },

  invalidEmail: {
    email: 'invalid-email',
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!'
  },

  weakPassword: {
    email: 'weak@test.com',
    password: '123',
    confirmPassword: '123'
  },

  passwordMismatch: {
    email: 'mismatch@test.com',
    password: 'TestPassword123!',
    confirmPassword: 'DifferentPassword123!'
  }
}

// Mock JWT token for tests
export const mockJwtToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsImV4cCI6OTk5OTk5OTk5OX0.test'

// Email verification token
export const mockEmailVerificationToken = 'test-verification-token-123'