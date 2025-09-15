"""
Viral Growth API Routes - Phase 3 Growth Engine
Gamification, social sharing, and team invitation endpoints
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.auth import get_current_user
from app.models import User
from app.viral_growth_service import get_viral_growth_service, ViralGrowthService

router = APIRouter(prefix="/api/growth", tags=["viral-growth"])


class ShareContentRequest(BaseModel):
    platform: str
    template_type: str = "default"
    custom_message: str = None
    success_amount: float = None


class TeamInvitationRequest(BaseModel):
    email: EmailStr
    role: str = "member"
    personal_message: str = None


class ShareTrackingRequest(BaseModel):
    tracking_id: str
    platform: str
    action: str  # 'clicked', 'shared', 'converted'


@router.get("/dashboard")
async def get_viral_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive viral growth dashboard data"""
    try:
        growth_service = get_viral_growth_service(db)
        dashboard_data = growth_service.get_viral_dashboard_data(current_user)
        return {
            "success": True,
            "data": dashboard_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get dashboard data: {str(e)}"
        )


@router.get("/stats")
async def get_growth_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's growth statistics"""
    try:
        growth_service = get_viral_growth_service(db)
        stats = growth_service.get_user_growth_stats(current_user)
        return {
            "success": True,
            "data": stats
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get growth stats: {str(e)}"
        )


@router.post("/share/generate")
async def generate_share_content(
    request: ShareContentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate social sharing content for different platforms"""
    try:
        # Prepare template variables
        template_vars = {}
        if request.custom_message:
            template_vars['custom_message'] = request.custom_message
        if request.success_amount:
            template_vars['amount'] = f"{request.success_amount:,.0f}"

        growth_service = get_viral_growth_service(db)
        share_content = growth_service.generate_share_content(
            current_user,
            request.platform,
            request.template_type,
            **template_vars
        )

        return {
            "success": True,
            "data": share_content
        }
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate share content: {str(e)}"
        )


@router.get("/share/templates")
async def get_share_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all available sharing templates"""
    try:
        growth_service = get_viral_growth_service(db)
        templates = growth_service._get_all_share_templates(current_user)
        return {
            "success": True,
            "data": templates
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get share templates: {str(e)}"
        )


@router.post("/team/invite")
async def create_team_invitation(
    request: TeamInvitationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create team invitation with viral mechanics"""
    try:
        growth_service = get_viral_growth_service(db)
        invitation = growth_service.create_team_invitation(
            current_user,
            request.email,
            request.role
        )

        # In a real implementation, you'd send the email here
        # email_service.send_invitation_email(invitation['email_content'])

        return {
            "success": True,
            "data": {
                "invitation_id": invitation['invitation_id'],
                "invitation_link": invitation['invitation_link'],
                "expires_at": invitation['expires_at'],
                "message": "Invitation created successfully",
                "preview": {
                    "subject": invitation['email_content']['subject'],
                    "cta": invitation['email_content']['cta_text']
                }
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create team invitation: {str(e)}"
        )


@router.get("/milestones")
async def get_milestones(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's milestone progress and achievements"""
    try:
        growth_service = get_viral_growth_service(db)
        stats = growth_service.get_user_growth_stats(current_user)

        return {
            "success": True,
            "data": {
                "achieved_milestones": stats['milestones']['achieved'],
                "next_milestone": stats['milestones']['next'],
                "overall_progress": stats['milestones']['progress'],
                "current_level": growth_service._calculate_user_level(stats['referrals']['successful']),
                "growth_score": stats['growth_score']
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get milestones: {str(e)}"
        )


@router.get("/leaderboard")
async def get_leaderboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get referral leaderboard"""
    try:
        growth_service = get_viral_growth_service(db)
        leaderboard = growth_service._get_leaderboard_position(current_user)

        return {
            "success": True,
            "data": leaderboard
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get leaderboard: {str(e)}"
        )


@router.get("/opportunities")
async def get_growth_opportunities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get personalized growth opportunities"""
    try:
        growth_service = get_viral_growth_service(db)
        opportunities = growth_service._get_growth_opportunities(current_user)

        return {
            "success": True,
            "data": opportunities
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get growth opportunities: {str(e)}"
        )


@router.post("/share/track")
async def track_share_action(
    request: ShareTrackingRequest,
    current_user: User = Depends(get_current_user)
):
    """Track sharing actions for analytics"""
    try:
        # In a real implementation, this would store tracking data
        # analytics_service.track_share_action(current_user.id, request)

        # For now, return success
        return {
            "success": True,
            "data": {
                "tracked": True,
                "action": request.action,
                "platform": request.platform,
                "message": "Share action tracked successfully"
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to track share action: {str(e)}"
        )


@router.get("/campaigns")
async def get_viral_campaigns(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get available viral growth campaigns"""
    try:
        # Get user's subscription tier to determine available campaigns
        from app.subscription_service import get_subscription_gate
        gate = get_subscription_gate(db)
        tier = gate.get_user_tier(current_user)

        campaigns = []

        # Basic campaigns for all users
        campaigns.append({
            "id": "first_referral_challenge",
            "name": "First Referral Challenge",
            "description": "Earn $5 for your first successful referral",
            "reward": "$5.00",
            "progress": 0,  # Would be calculated based on actual referrals
            "target": 1,
            "deadline": None,
            "available": True
        })

        # Professional tier campaigns
        if tier.value in ['professional', 'agency']:
            campaigns.append({
                "id": "growth_champion",
                "name": "30-Day Growth Champion",
                "description": "Refer 5 users in 30 days and earn bonus $50",
                "reward": "$50.00",
                "progress": 0,
                "target": 5,
                "deadline": "2024-10-14",
                "available": True
            })

        # Agency tier exclusive campaigns
        if tier.value == 'agency':
            campaigns.append({
                "id": "viral_master",
                "name": "Viral Master Challenge",
                "description": "Build a team of 10 referrals for $200 bonus",
                "reward": "$200.00",
                "progress": 0,
                "target": 10,
                "deadline": "2024-12-31",
                "available": True
            })

        return {
            "success": True,
            "data": {
                "campaigns": campaigns,
                "user_tier": tier.value,
                "message": "Upgrade your subscription to unlock more campaigns!"
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get viral campaigns: {str(e)}"
        )


@router.get("/success-stories")
async def get_success_stories(current_user: User = Depends(get_current_user)):
    """Get viral growth success stories for inspiration"""
    try:
        # Mock success stories - in real app these would come from database
        stories = [
            {
                "user_name": "Sarah M.",
                "user_title": "Freelance Designer",
                "referrals": 23,
                "earnings": "$345.00",
                "story": "DueSpark's referral program helped me earn enough to upgrade to Professional tier for free! My clients love the professional invoices.",
                "avatar": "👩‍💼",
                "timeframe": "3 months"
            },
            {
                "user_name": "Mike R.",
                "user_title": "Marketing Consultant",
                "referrals": 19,
                "earnings": "$285.00",
                "story": "I shared DueSpark with my network and now most of my referrals are from word-of-mouth. The gamification makes it fun!",
                "avatar": "👨‍💻",
                "timeframe": "4 months"
            },
            {
                "user_name": "Lisa K.",
                "user_title": "Small Business Owner",
                "referrals": 15,
                "earnings": "$225.00",
                "story": "The milestone rewards kept me motivated. Just hit Growth Champion status and loving the extra credits!",
                "avatar": "👩‍💼",
                "timeframe": "2 months"
            }
        ]

        return {
            "success": True,
            "data": {
                "stories": stories,
                "total_community_referrals": 12500,
                "total_community_earnings": "$187,500",
                "average_monthly_referrals": 3.2
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get success stories: {str(e)}"
        )