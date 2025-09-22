import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Crown, CreditCard, Pause, Play, Gift, ExternalLink, Users, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { apiClient } from '@/api/client'
import { cn } from '@/lib/utils'

interface SubscriptionInfo {
  tier: string
  status: string
  reminders_per_month: number
  reminders_sent_this_period: number
  current_period_end?: string
  stripe_customer_id?: string
  paused: boolean
  cancel_at_period_end: boolean
}

const TIER_DETAILS = {
  freemium: {
    name: 'Freemium',
    price: '$0',
    color: 'bg-gray-100 text-gray-800',
    description: 'Perfect for getting started with basic invoice reminders',
    features: ['5 clients max', '20 invoices/month', 'Basic templates', 'Daily reminders', 'Email support']
  },
  professional: {
    name: 'Professional',
    price: '$29',
    color: 'bg-purple-100 text-purple-800',
    description: 'Everything you need to scale your business with AI-powered features',
    features: ['Unlimited clients', 'Unlimited invoices', 'AI-powered features', 'Custom branding', 'Advanced analytics', 'Priority support', 'Integrations']
  },
  agency: {
    name: 'Agency',
    price: '$99',
    color: 'bg-gold-100 text-gold-800',
    description: 'Advanced collaboration and white-label options for agencies and teams',
    features: ['Everything in Professional', 'Multi-user access', 'API access', 'White-label branding', 'Realtime reminders', 'Zapier integration', 'Webhooks']
  }
}

export function SubscriptionView() {
  const [couponCode, setCouponCode] = useState('')
  const queryClient = useQueryClient()

  const { data: subscription, isLoading, error } = useQuery<SubscriptionInfo>({
    queryKey: ['subscription'],
    queryFn: apiClient.getSubscriptionInfo,
    retry: 0,
    staleTime: 0,
    gcTime: 0,
  })

  // Referral credits query
  const { data: creditsData } = useQuery({
    queryKey: ['creditsBreakdown'],
    queryFn: apiClient.getCreditsBreakdown,
    retry: 0,
  })

  // Debug logging
  console.log('Subscription Query State:', { isLoading, error, subscription })

  const upgradeMutation = useMutation({
    mutationFn: (tier: string) => apiClient.upgradeSubscription(tier),
    onSuccess: (data) => {
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else if (data.message) {
        // Show demo mode message
        alert(data.message)
      }
    }
  })

  const billingPortalMutation = useMutation({
    mutationFn: apiClient.openBillingPortal,
    onSuccess: (data) => {
      if (data.portal_url) {
        window.open(data.portal_url, '_blank')
      }
    }
  })

  const couponMutation = useMutation({
    mutationFn: (code: string) => apiClient.applyCoupon(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      setCouponCode('')
    }
  })

  const pauseMutation = useMutation({
    mutationFn: apiClient.pauseSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    }
  })

  const resumeMutation = useMutation({
    mutationFn: apiClient.resumeSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load subscription information</p>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No subscription information available</p>
      </div>
    )
  }

  const currentTier = TIER_DETAILS[subscription.tier as keyof typeof TIER_DETAILS] || TIER_DETAILS.freemium
  const usagePercentage = (subscription.reminders_sent_this_period / subscription.reminders_per_month) * 100

  return (
    <div className="space-y-6">
      <section className="px-6 pt-2 pb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription</h1>
        <p className="text-gray-600 dark:text-gray-300">Manage your DueSpark subscription</p>
      </section>

      {/* Current Plan */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 text-yellow-500" />
            <div>
              <h2 className="text-xl font-semibold">Current Plan</h2>
              <p className="text-gray-600 dark:text-gray-400">{currentTier.description}</p>
            </div>
          </div>
          <Badge className={cn(currentTier.color, 'text-sm font-medium px-3 py-1')}>
            {currentTier.name} - {currentTier.price}/month
          </Badge>
        </div>

        {/* Usage Meter */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Reminders Used This Month</span>
            <span>{subscription.reminders_sent_this_period} / {subscription.reminders_per_month}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                usagePercentage > 90 ? 'bg-red-500' :
                usagePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
              )}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
          {usagePercentage > 90 && (
            <p className="text-red-600 text-sm mt-1">
              ⚠️ You're close to your reminder limit. Consider upgrading to avoid interruption.
            </p>
          )}
        </div>

        {/* Status & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant={subscription.status === 'active' ? 'success' : 'warning'}>
              {subscription.status}
            </Badge>
            {subscription.paused && (
              <Badge variant="secondary">Paused</Badge>
            )}
            {subscription.cancel_at_period_end && (
              <Badge variant="warning">Cancels at period end</Badge>
            )}
          </div>

          <div className="flex gap-2">
            {subscription.paused ? (
              <Button
                onClick={() => resumeMutation.mutate()}
                disabled={resumeMutation.isPending}
                size="sm"
                variant="outline"
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            ) : (
              <Button
                onClick={() => pauseMutation.mutate()}
                disabled={pauseMutation.isPending}
                size="sm"
                variant="outline"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}

            {subscription.stripe_customer_id && (
              <Button
                onClick={() => billingPortalMutation.mutate()}
                disabled={billingPortalMutation.isPending}
                size="sm"
                variant="outline"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Billing Portal
                <ExternalLink className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Upgrade Plans */}
      {subscription.tier !== 'agency' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Upgrade Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(TIER_DETAILS)
              .filter(([tier]) => {
                const tierOrder = { freemium: 0, professional: 1, agency: 2 }
                return tierOrder[tier as keyof typeof tierOrder] > tierOrder[subscription.tier as keyof typeof tierOrder]
              })
              .map(([tier, details]) => (
                <Card key={tier} className="overflow-hidden bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                  <div className="flex flex-col h-full">
                    {/* Header Section */}
                    <div className="relative p-6">
                      <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {details.name}
                      </h3>
                      <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                        {details.price}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        per month
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {details.description}
                      </p>
                    </div>

                    {/* Features Section */}
                    <div className="px-6 pb-6 flex-grow">
                      <ul className="space-y-3">
                        {details.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mt-0.5 flex-shrink-0">
                              <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Button Section */}
                    <div className="p-6 pt-0">
                      <Button
                        onClick={() => upgradeMutation.mutate(tier)}
                        disabled={upgradeMutation.isPending}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-lg font-medium transition-colors duration-200"
                      >
                        {upgradeMutation.isPending ? 'Processing...' : `Upgrade to ${details.name}`}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Referral Credits Section */}
      {creditsData && creditsData.total_remaining_months > 0 && (
        <Card className="p-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
              Referral Credits
            </h3>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {creditsData.total_remaining_months} month{creditsData.total_remaining_months !== 1 ? 's' : ''} remaining
              </p>
              <p className="text-green-600 dark:text-green-400 text-sm">
                Free subscription time from referrals
              </p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>

          {creditsData.credits && creditsData.credits.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-green-800 dark:text-green-200">Active Credits:</h4>
              {creditsData.credits.slice(0, 3).map((credit: any) => (
                <div key={credit.id} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {credit.description}
                  </span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {credit.remaining_months} / {credit.credit_months} months
                  </span>
                </div>
              ))}
              {creditsData.credits.length > 3 && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  ...and {creditsData.credits.length - 3} more
                </p>
              )}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-300 mb-2">
              Want more free time? Invite friends to DueSpark!
            </p>
            <Button
              onClick={() => window.location.href = '/referrals'}
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Referrals
            </Button>
          </div>
        </Card>
      )}

      {/* Coupon Section */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Gift className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold">Have a Coupon?</h3>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Enter coupon code"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <Button
            onClick={() => couponMutation.mutate(couponCode)}
            disabled={!couponCode || couponMutation.isPending}
          >
            Apply
          </Button>
        </div>
        {couponMutation.isError && (
          <p className="text-red-600 text-sm mt-2">
            Failed to apply coupon. Please check the code and try again.
          </p>
        )}
      </Card>
    </div>
  )
}
