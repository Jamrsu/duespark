from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .auth import get_current_admin_user, get_current_user
from .database import get_db
from .models import User
from .referral_service import referral_service

router = APIRouter(prefix="/api/referrals", tags=["referrals"])


class ValidateReferralRequest(BaseModel):
    referral_code: str


class ValidateReferralResponse(BaseModel):
    valid: bool
    message: str


class ReferralStatsResponse(BaseModel):
    referral_code: str
    share_link: str
    total_referrals: int
    successful_referrals: int
    pending_referrals: int
    total_credits_earned: int
    remaining_credits: int


class CreditsBreakdownResponse(BaseModel):
    total_remaining_months: int


class AdminGrantCreditRequest(BaseModel):
    user_id: int
    months: int
    description: str


class AdminRevokeReferralRequest(BaseModel):
    user_id: int
    reason: str


@router.get("/my-code")
async def get_my_referral_code(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get current user's referral code"""
    try:
        code = referral_service.ensure_user_has_referral_code(current_user, db)
        share_link = (
            f"https://app.duespark.com/register?ref={code}"  # TODO: Use actual app URL
        )

        return {"data": {"referral_code": code, "share_link": share_link}, "meta": {}}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate referral code: {str(e)}",
        )


@router.post("/validate", response_model=dict)
async def validate_referral_code(
    request: ValidateReferralRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Validate a referral code (for new user registration)"""
    is_valid, message, referrer = referral_service.validate_referral_code(
        request.referral_code, current_user, db
    )

    return {
        "data": {
            "valid": is_valid,
            "message": message,
            "referrer_name": referrer.email.split("@")[0] if referrer else None,
        },
        "meta": {},
    }


@router.get("/stats")
async def get_referral_stats(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get user's referral statistics"""
    try:
        # Ensure user has referral code
        code = referral_service.ensure_user_has_referral_code(current_user, db)
        share_link = f"https://app.duespark.com/register?ref={code}"

        # Get stats
        stats = referral_service.get_user_referral_stats(current_user.id, db)

        return {
            "data": {"referral_code": code, "share_link": share_link, **stats},
            "meta": {},
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get referral stats: {str(e)}",
        )


@router.get("/credits")
async def get_credits_breakdown(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get user's subscription credits breakdown"""
    try:
        breakdown = referral_service.get_user_credits_breakdown(current_user.id, db)
        return {"data": breakdown, "meta": {}}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get credits breakdown: {str(e)}",
        )


# Admin endpoints
@router.post("/admin/grant-credit")
async def admin_grant_credit(
    request: AdminGrantCreditRequest,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Admin endpoint to grant credits to a user"""
    try:
        # Verify target user exists
        target_user = db.query(User).filter(User.id == request.user_id).first()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        credit = referral_service.admin_grant_credit(
            request.user_id, request.months, request.description, admin_user.id, db
        )

        return {
            "data": {
                "id": credit.id,
                "user_id": credit.user_id,
                "credit_months": credit.credit_months,
                "remaining_months": credit.remaining_months,
                "description": credit.description,
                "created_at": credit.created_at.isoformat(),
            },
            "meta": {},
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to grant credit: {str(e)}",
        )


@router.post("/admin/revoke-referral")
async def admin_revoke_referral(
    request: AdminRevokeReferralRequest,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Admin endpoint to revoke a referral reward"""
    try:
        success = referral_service.revoke_referral_reward(
            request.user_id, request.reason, db
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No referral reward found to revoke",
            )

        return {
            "data": {
                "success": True,
                "message": f"Referral reward revoked for user {request.user_id}",
                "reason": request.reason,
            },
            "meta": {},
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to revoke referral: {str(e)}",
        )


@router.post("/admin/process-pending")
async def admin_process_pending_rewards(
    admin_user: User = Depends(get_current_admin_user), db: Session = Depends(get_db)
):
    """Admin endpoint to manually process pending referral rewards"""
    try:
        rewards_granted = referral_service.process_pending_referral_rewards(db)

        return {
            "data": {
                "rewards_granted": rewards_granted,
                "message": f"Processed {rewards_granted} pending referral rewards",
            },
            "meta": {},
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process pending rewards: {str(e)}",
        )
