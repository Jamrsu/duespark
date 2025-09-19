"""
Viral Growth Service - Phase 3 Growth Engine
Implements gamification, social sharing, and viral mechanics for user acquisition
"""

import json
import secrets
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.models import (
    Referral,
    Subscription,
    SubscriptionCredit,
    SubscriptionTier,
    User,
)
from app.subscription_service import SubscriptionGate


class GrowthMilestone:
    """Define growth milestones for gamification"""

    MILESTONES = {
        "first_referral": {
            "name": "First Share",
            "description": "Made your first referral",
            "reward_credits": 500,  # $5.00
            "badge": "🎯",
            "requirement": 1,
        },
        "growth_champion": {
            "name": "Growth Champion",
            "description": "Successfully referred 5 users",
            "reward_credits": 2500,  # $25.00
            "badge": "🏆",
            "requirement": 5,
        },
        "viral_influencer": {
            "name": "Viral Influencer",
            "description": "Successfully referred 10 users",
            "reward_credits": 5000,  # $50.00
            "badge": "🚀",
            "requirement": 10,
        },
        "community_builder": {
            "name": "Community Builder",
            "description": "Successfully referred 25 users",
            "reward_credits": 10000,  # $100.00
            "badge": "👑",
            "requirement": 25,
        },
    }


class SocialShareTemplate:
    """Templates for social sharing"""

    TEMPLATES = {
        "twitter": {
            "default": "Just started using DueSpark for automated invoice reminders! 📧💰 It's saving me hours each week. Try it free: {share_link} #{hashtags}",
            "success_story": "DueSpark helped me collect ${amount} in overdue invoices this month! 🎉 Automated reminders work: {share_link} #{hashtags}",
            "hashtags": "freelance,invoicing,automation,smallbusiness",
        },
        "linkedin": {
            "default": "I've been using DueSpark to automate my invoice follow-ups, and it's been a game-changer for my freelance business. The AI-powered scheduling ensures I get paid faster without the awkward follow-ups. Highly recommend: {share_link}",
            "success_story": "Results speak for themselves: DueSpark's automated invoice reminders helped me collect ${amount} in overdue payments this month. Perfect for freelancers and small businesses: {share_link}",
        },
        "email": {
            "default": "Hey! I found this great tool for automating invoice reminders - it's called DueSpark. Thought you might find it useful for your business too: {share_link}",
            "personal": "Hi {name}! Remember how we talked about getting paid faster? I've been using DueSpark for my invoices and it's amazing. You should check it out: {share_link}",
        },
    }


class ViralGrowthService:
    """Service for viral growth mechanics and gamification"""

    def __init__(self, db: Session):
        self.db = db
        self.subscription_gate = SubscriptionGate(db)

    def get_user_growth_stats(self, user: User) -> Dict:
        """Get comprehensive growth statistics for user"""
        # Get referral stats
        total_referrals = (
            self.db.query(Referral).filter(Referral.referrer_id == user.id).count()
        )
        successful_referrals = (
            self.db.query(Referral)
            .filter(Referral.referrer_id == user.id, Referral.status == "completed")
            .count()
        )

        # Get earned credits
        total_credits = (
            self.db.query(func.sum(SubscriptionCredit.dollar_amount_cents))
            .filter(
                SubscriptionCredit.user_id == user.id,
                SubscriptionCredit.credit_type == "referral",
            )
            .scalar()
            or 0
        )

        # Get current subscription tier
        subscription = self.subscription_gate.get_user_subscription(user)

        # Calculate next milestone
        next_milestone = self._get_next_milestone(successful_referrals)

        # Get social sharing stats (can be tracked later)
        sharing_stats = {
            "total_shares": 0,  # Placeholder for future tracking
            "platform_breakdown": {
                "twitter": 0,
                "linkedin": 0,
                "email": 0,
                "direct_link": 0,
            },
        }

        return {
            "referrals": {
                "total": total_referrals,
                "successful": successful_referrals,
                "conversion_rate": (
                    (successful_referrals / total_referrals * 100)
                    if total_referrals > 0
                    else 0
                ),
            },
            "rewards": {
                "total_earned_cents": total_credits,
                "total_earned_display": f"${total_credits/100:.2f}",
                "current_tier": subscription.tier.value,
                "tier_benefits": self._get_tier_benefits(subscription.tier),
            },
            "milestones": {
                "achieved": self._get_achieved_milestones(successful_referrals),
                "next": next_milestone,
                "progress": self._get_milestone_progress(successful_referrals),
            },
            "sharing": sharing_stats,
            "growth_score": self._calculate_growth_score(
                successful_referrals, total_credits
            ),
        }

    def generate_share_content(
        self, user: User, platform: str, template_type: str = "default", **kwargs
    ) -> Dict:
        """Generate social sharing content for different platforms"""
        if platform not in SocialShareTemplate.TEMPLATES:
            raise ValueError(f"Unsupported platform: {platform}")

        templates = SocialShareTemplate.TEMPLATES[platform]
        if template_type not in templates:
            template_type = "default"

        # Generate personalized share link
        share_link = self._generate_tracking_link(user, platform)

        # Prepare template variables
        template_vars = {
            "share_link": share_link,
            "user_name": user.name or "Friend",
            **kwargs,
        }

        if platform == "twitter":
            template_vars["hashtags"] = templates.get("hashtags", "")

        # Generate content
        content = templates[template_type].format(**template_vars)

        return {
            "platform": platform,
            "content": content,
            "share_link": share_link,
            "tracking_id": self._generate_tracking_id(),
            "suggested_actions": self._get_platform_suggestions(platform),
        }

    def create_team_invitation(
        self, inviter: User, email: str, role: str = "member"
    ) -> Dict:
        """Create team invitation with viral mechanics"""
        # Generate invitation token
        invitation_token = secrets.token_urlsafe(32)

        # Create invitation link
        invitation_link = f"https://duespark.com/invite/{invitation_token}"

        # Store invitation (would need Team/Invitation model)
        invitation_data = {
            "inviter_id": inviter.id,
            "email": email,
            "role": role,
            "token": invitation_token,
            "created_at": datetime.now(timezone.utc),
            "status": "pending",
        }

        # Generate invitation email content
        email_content = self._generate_invitation_email(inviter, email, invitation_link)

        return {
            "invitation_id": invitation_token,
            "invitation_link": invitation_link,
            "email_content": email_content,
            "expires_at": (
                datetime.now(timezone.utc).timestamp() + 7 * 24 * 3600
            ),  # 7 days
            "sharing_benefits": self._get_team_sharing_benefits(inviter),
        }

    def process_referral_milestone(
        self, user: User, successful_referrals: int
    ) -> Optional[Dict]:
        """Process milestone achievements and rewards"""
        milestone = self._check_milestone_achievement(successful_referrals)

        if not milestone:
            return None

        # Award milestone bonus
        milestone_data = GrowthMilestone.MILESTONES[milestone]

        # Create bonus credit
        bonus_credit = SubscriptionCredit(
            user_id=user.id,
            months_credit=0,  # Milestone rewards are dollar credits
            dollar_amount_cents=milestone_data["reward_credits"],
            credit_type="milestone",
            description=f"Milestone Achievement: {milestone_data['name']}",
            expires_at=None,  # Milestone credits don't expire
        )

        self.db.add(bonus_credit)
        self.db.commit()

        return {
            "milestone_achieved": milestone,
            "badge_earned": milestone_data["badge"],
            "reward_cents": milestone_data["reward_credits"],
            "reward_display": f"${milestone_data['reward_credits']/100:.2f}",
            "title": milestone_data["name"],
            "description": milestone_data["description"],
            "celebration_message": f"🎉 Congratulations! You've achieved {milestone_data['name']}!",
        }

    def get_viral_dashboard_data(self, user: User) -> Dict:
        """Get comprehensive viral growth dashboard data"""
        growth_stats = self.get_user_growth_stats(user)

        # Get leaderboard position (among user's network)
        leaderboard_position = self._get_leaderboard_position(user)

        # Get growth opportunities
        opportunities = self._get_growth_opportunities(user)

        # Get recent achievements
        recent_achievements = self._get_recent_achievements(user)

        return {
            "user": {
                "name": user.name,
                "email": user.email,
                "referral_code": user.referral_code,
                "member_since": user.created_at.isoformat(),
            },
            "stats": growth_stats,
            "leaderboard": leaderboard_position,
            "opportunities": opportunities,
            "recent_achievements": recent_achievements,
            "share_templates": self._get_all_share_templates(user),
            "gamification": {
                "level": self._calculate_user_level(
                    growth_stats["referrals"]["successful"]
                ),
                "points": growth_stats["growth_score"],
                "badges": growth_stats["milestones"]["achieved"],
            },
        }

    # Private helper methods

    def _generate_tracking_link(self, user: User, platform: str) -> str:
        """Generate tracking link for attribution"""
        base_url = "https://duespark.com"
        return f"{base_url}/signup?ref={user.referral_code}&utm_source={platform}&utm_medium=referral&utm_campaign=viral_growth"

    def _generate_tracking_id(self) -> str:
        """Generate unique tracking ID for analytics"""
        return secrets.token_urlsafe(16)

    def _get_next_milestone(self, current_referrals: int) -> Optional[Dict]:
        """Get the next milestone the user can achieve"""
        for milestone_key, milestone_data in GrowthMilestone.MILESTONES.items():
            if current_referrals < milestone_data["requirement"]:
                return {
                    "key": milestone_key,
                    "name": milestone_data["name"],
                    "requirement": milestone_data["requirement"],
                    "progress": current_referrals,
                    "remaining": milestone_data["requirement"] - current_referrals,
                    "reward": f"${milestone_data['reward_credits']/100:.2f}",
                    "badge": milestone_data["badge"],
                }
        return None

    def _get_achieved_milestones(self, successful_referrals: int) -> List[Dict]:
        """Get all milestones achieved by user"""
        achieved = []
        for milestone_key, milestone_data in GrowthMilestone.MILESTONES.items():
            if successful_referrals >= milestone_data["requirement"]:
                achieved.append(
                    {
                        "key": milestone_key,
                        "name": milestone_data["name"],
                        "badge": milestone_data["badge"],
                        "achieved_at": "Recently",  # Could track actual achievement date
                    }
                )
        return achieved

    def _get_milestone_progress(self, successful_referrals: int) -> Dict:
        """Get overall milestone progress"""
        total_milestones = len(GrowthMilestone.MILESTONES)
        achieved_count = len(self._get_achieved_milestones(successful_referrals))

        return {
            "completed": achieved_count,
            "total": total_milestones,
            "percentage": (
                (achieved_count / total_milestones * 100) if total_milestones > 0 else 0
            ),
        }

    def _calculate_growth_score(
        self, successful_referrals: int, total_credits: int
    ) -> int:
        """Calculate user's overall growth score"""
        # Base score from referrals
        referral_score = successful_referrals * 100

        # Bonus from credits earned (1 cent = 1 point)
        credit_score = total_credits

        # Milestone bonuses
        milestone_bonus = len(self._get_achieved_milestones(successful_referrals)) * 500

        return referral_score + credit_score + milestone_bonus

    def _get_tier_benefits(self, tier: SubscriptionTier) -> List[str]:
        """Get referral benefits for current subscription tier"""
        benefits = {
            SubscriptionTier.freemium: [
                "Earn $5 for each successful referral",
                "Basic referral tracking",
            ],
            SubscriptionTier.professional: [
                "Earn $10 for each successful referral",
                "Advanced referral analytics",
                "Custom referral landing pages",
                "Social media integration",
            ],
            SubscriptionTier.agency: [
                "Earn $15 for each successful referral",
                "Team referral management",
                "White-label referral program",
                "Advanced viral mechanics",
                "Commission tracking",
            ],
        }
        return benefits.get(tier, benefits[SubscriptionTier.freemium])

    def _check_milestone_achievement(self, successful_referrals: int) -> Optional[str]:
        """Check if user just achieved a new milestone"""
        # This would be called when a referral is completed
        # Return the milestone key if just achieved
        for milestone_key, milestone_data in GrowthMilestone.MILESTONES.items():
            if successful_referrals == milestone_data["requirement"]:
                return milestone_key
        return None

    def _get_platform_suggestions(self, platform: str) -> List[str]:
        """Get platform-specific sharing suggestions"""
        suggestions = {
            "twitter": [
                "Share during business hours for better engagement",
                "Include relevant hashtags",
                "Tag industry influencers",
            ],
            "linkedin": [
                "Share professional success stories",
                "Post in relevant business groups",
                "Write a longer-form post about your experience",
            ],
            "email": [
                "Personalize the message",
                "Mention specific benefits for the recipient",
                "Follow up after they sign up",
            ],
        }
        return suggestions.get(platform, [])

    def _generate_invitation_email(self, inviter: User, email: str, link: str) -> Dict:
        """Generate team invitation email content"""
        return {
            "subject": f"{inviter.name} invited you to join their team on DueSpark",
            "body": f"""Hi there!

{inviter.name} has invited you to join their team on DueSpark, the automated invoice reminder platform.

DueSpark helps freelancers and small businesses get paid faster with smart, automated reminders that adapt to each client's payment behavior.

Join the team: {link}

Here's what you'll get:
✅ Automated invoice reminders
✅ AI-powered scheduling
✅ Professional email templates
✅ Team collaboration features

Ready to get started? Click the link above to accept the invitation.

Best regards,
The DueSpark Team""",
            "cta_text": "Accept Invitation",
            "cta_link": link,
        }

    def _get_team_sharing_benefits(self, user: User) -> List[str]:
        """Get benefits of team sharing for current user"""
        tier = self.subscription_gate.get_user_tier(user)

        if tier == SubscriptionTier.agency:
            return [
                "Team members get 50% off their first year",
                "You earn $20 for each team member who upgrades",
                "Shared referral credits across team",
                "Team leaderboard and competitions",
            ]
        else:
            return [
                "Help your colleagues get organized",
                "Build stronger business relationships",
                "Earn referral rewards when they upgrade",
            ]

    def _get_leaderboard_position(self, user: User) -> Dict:
        """Get user's position on referral leaderboard"""
        # This would query actual leaderboard data
        return {
            "position": 42,
            "total_participants": 1287,
            "percentile": 85,
            "top_referrers": [
                {"name": "Sarah M.", "referrals": 23, "badge": "👑"},
                {"name": "Mike R.", "referrals": 19, "badge": "🚀"},
                {"name": "Lisa K.", "referrals": 15, "badge": "🏆"},
            ],
        }

    def _get_growth_opportunities(self, user: User) -> List[Dict]:
        """Get personalized growth opportunities"""
        return [
            {
                "type": "social_share",
                "title": "Share your success on LinkedIn",
                "description": "Professional networks have 3x higher conversion rates",
                "action": "Create LinkedIn post",
                "potential_value": "$50+",
            },
            {
                "type": "email_campaign",
                "title": "Email your network",
                "description": "Personal recommendations convert 5x better",
                "action": "Send personalized emails",
                "potential_value": "$100+",
            },
            {
                "type": "milestone",
                "title": "Reach Growth Champion status",
                "description": "Just 2 more referrals to earn $25 bonus",
                "action": "Invite 2 more friends",
                "potential_value": "$25",
            },
        ]

    def _get_recent_achievements(self, user: User) -> List[Dict]:
        """Get user's recent achievements"""
        # This would query actual achievement data
        return [
            {
                "type": "referral",
                "title": "New Referral!",
                "description": "John D. signed up using your link",
                "timestamp": "2 hours ago",
                "reward": "$5.00",
            }
        ]

    def _get_all_share_templates(self, user: User) -> Dict:
        """Get all sharing templates for user"""
        templates = {}
        for platform in SocialShareTemplate.TEMPLATES.keys():
            templates[platform] = self.generate_share_content(user, platform)
        return templates

    def _calculate_user_level(self, successful_referrals: int) -> Dict:
        """Calculate user level based on referrals"""
        if successful_referrals >= 25:
            return {"level": 5, "title": "Viral Master", "emoji": "👑"}
        elif successful_referrals >= 10:
            return {"level": 4, "title": "Growth Leader", "emoji": "🚀"}
        elif successful_referrals >= 5:
            return {"level": 3, "title": "Champion", "emoji": "🏆"}
        elif successful_referrals >= 1:
            return {"level": 2, "title": "Starter", "emoji": "🎯"}
        else:
            return {"level": 1, "title": "Newcomer", "emoji": "🌟"}


# Dependency injection
def get_viral_growth_service(db: Session) -> ViralGrowthService:
    """Dependency to get viral growth service"""
    return ViralGrowthService(db)
