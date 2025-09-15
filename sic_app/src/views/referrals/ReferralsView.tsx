import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Share2, Copy, Users, Gift, Calendar, CheckCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { apiClient } from '@/api/client'
import toast from 'react-hot-toast'
import { Card } from '@/components/ui/Card'

interface ReferralData {
  referral_code: string
  share_link: string
  total_referrals: number
  successful_referrals: number
  pending_referrals: number
  total_credits_earned: number
  remaining_credits: number
  referrals: Array<{
    id: number
    referred_user_email: string
    created_at: string
    reward_granted: boolean
    rewarded_at: string | null
    reward_months: number
  }>
}

interface CreditsData {
  total_remaining_months: number
  credits: Array<{
    id: number
    source: string
    description: string
    credit_months: number
    remaining_months: number
    created_at: string
    expires_at: string | null
  }>
}

export function ReferralsView() {
  const { data: referralData, isLoading: isLoadingReferrals } = useQuery<ReferralData>({
    queryKey: ['referralStats'],
    queryFn: apiClient.getReferralStats,
  })

  const { data: creditsData, isLoading: isLoadingCredits } = useQuery<CreditsData>({
    queryKey: ['creditsBreakdown'],
    queryFn: apiClient.getCreditsBreakdown,
  })

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const shareReferralLink = async () => {
    if (navigator.share && referralData?.share_link) {
      try {
        await navigator.share({
          title: 'Join DueSpark',
          text: 'Get started with DueSpark and help me earn free subscription time!',
          url: referralData.share_link,
        })
      } catch (err) {
        // Fall back to clipboard
        copyToClipboard(referralData.share_link)
      }
    } else if (referralData?.share_link) {
      copyToClipboard(referralData.share_link)
    }
  }

  if (isLoadingReferrals || isLoadingCredits) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Referral Program
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Invite friends and earn free subscription time. Get 1 month for each successful referral!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Referrals
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {referralData?.total_referrals || 0}
              </p>
            </div>
            <Users className="h-8 w-8 text-primary-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Credits Earned
              </p>
              <p className="text-2xl font-bold text-green-600">
                {referralData?.total_credits_earned || 0} months
              </p>
            </div>
            <Gift className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Credits Remaining
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {creditsData?.total_remaining_months || 0} months
              </p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Share Section */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Share Your Referral Link
        </h3>

        <div className="space-y-4">
          {/* Referral Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Referral Code
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 border rounded-lg font-mono text-lg tracking-wider">
                {referralData?.referral_code || 'Loading...'}
              </div>
              <Button
                onClick={() => copyToClipboard(referralData?.referral_code || '')}
                variant="outline"
                size="sm"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Share Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Share Link
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 border rounded-lg text-sm break-all">
                {referralData?.share_link || 'Loading...'}
              </div>
              <Button
                onClick={() => copyToClipboard(referralData?.share_link || '')}
                variant="outline"
                size="sm"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Share Button */}
          <Button onClick={shareReferralLink} className="w-full md:w-auto">
            <Share2 className="h-4 w-4 mr-2" />
            Share Referral Link
          </Button>
        </div>
      </Card>

      {/* Referral History */}
      {referralData && referralData.referrals.length > 0 && (
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Referral History
          </h3>

          <div className="space-y-3">
            {referralData.referrals.map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-1 rounded-full ${referral.reward_granted ? 'bg-green-100' : 'bg-yellow-100'}`}>
                    {referral.reward_granted ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {referral.referred_user_email}
                    </p>
                    <p className="text-sm text-gray-500">
                      Joined {new Date(referral.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${referral.reward_granted ? 'text-green-600' : 'text-yellow-600'}`}>
                    {referral.reward_granted ? 'Rewarded' : 'Pending'}
                  </p>
                  {referral.reward_granted && (
                    <p className="text-xs text-gray-500">
                      +{referral.reward_months} month{referral.reward_months !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Credits Breakdown */}
      {creditsData && creditsData.credits.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Subscription Credits
          </h3>

          <div className="space-y-3">
            {creditsData.credits.map((credit) => (
              <div
                key={credit.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {credit.description}
                  </p>
                  <p className="text-sm text-gray-500">
                    {credit.source === 'referral' ? '🎁 Referral Bonus' :
                     credit.source === 'admin_grant' ? '👨‍💼 Admin Grant' :
                     '💝 Credit'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Earned {new Date(credit.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {credit.remaining_months} / {credit.credit_months} months
                  </p>
                  {credit.expires_at && (
                    <p className="text-xs text-gray-500">
                      Expires {new Date(credit.expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {referralData && referralData.total_referrals === 0 && (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No referrals yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Start inviting friends to earn free subscription time!
          </p>
          <Button onClick={shareReferralLink}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Your Link
          </Button>
        </Card>
      )}
    </div>
  )
}