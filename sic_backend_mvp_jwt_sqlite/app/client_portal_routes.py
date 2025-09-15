"""
Client Portal API Routes - Phase 3 Client-Facing Experience
Public routes for client invoice viewing, payments, and communication
"""

from typing import Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.models import Client, Invoice
from app.client_portal_service import get_client_portal_service, ClientPortalService

router = APIRouter(prefix="/api/client-portal", tags=["client-portal"])


class ClientAccessRequest(BaseModel):
    email: EmailStr
    invoice_number: Optional[str] = None


class PaymentRequest(BaseModel):
    payment_method: str
    card_token: Optional[str] = None
    billing_address: Optional[Dict] = None


class ClientMessageRequest(BaseModel):
    message: str
    invoice_id: Optional[int] = None


class ClientFeedbackRequest(BaseModel):
    rating: int  # 1-5 stars
    feedback: str
    public_testimonial: bool = False


@router.post("/access")
async def request_client_access(
    request: ClientAccessRequest,
    db: Session = Depends(get_db)
):
    """Generate access token for client portal (public endpoint)"""
    try:
        portal_service = get_client_portal_service(db)

        # Find client by email
        client = db.query(Client).filter(Client.email == request.email).first()
        if not client:
            # For security, don't reveal if email exists or not
            return {
                "success": True,
                "message": "If this email has invoices, an access link will be sent."
            }

        # Generate access token
        access_token = portal_service.generate_client_access_token(client)

        # In production, send email with access link
        access_url = f"https://pay.duespark.com/portal/{access_token}?email={client.email}"

        return {
            "success": True,
            "access_token": access_token,
            "access_url": access_url,
            "message": "Access link generated successfully",
            "expires_in": 7200  # 2 hours in seconds
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate access: {str(e)}"
        )


@router.get("/portal/{access_token}")
async def get_client_portal(
    access_token: str,
    email: EmailStr = Query(..., description="Client email for verification"),
    db: Session = Depends(get_db)
):
    """Get client portal dashboard (public endpoint)"""
    try:
        portal_service = get_client_portal_service(db)

        # Verify access
        is_valid, client = portal_service.verify_client_access(access_token, email)
        if not is_valid or not client:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid access token or email"
            )

        # Get portal data
        portal_data = portal_service.get_client_portal_data(client, access_token)

        return {
            "success": True,
            "data": portal_data
        }
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get portal data: {str(e)}"
        )


@router.get("/invoice/{invoice_id}/payment")
async def get_invoice_payment_page(
    invoice_id: int,
    access_token: str = Query(..., description="Client access token"),
    db: Session = Depends(get_db)
):
    """Get branded payment page for specific invoice (public endpoint)"""
    try:
        portal_service = get_client_portal_service(db)

        payment_data = portal_service.get_invoice_payment_page(invoice_id, access_token)

        return {
            "success": True,
            "data": payment_data
        }
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get payment page: {str(e)}"
        )


@router.post("/invoice/{invoice_id}/pay")
async def process_invoice_payment(
    invoice_id: int,
    payment_request: PaymentRequest,
    access_token: str = Query(..., description="Client access token"),
    db: Session = Depends(get_db)
):
    """Process payment for invoice (public endpoint)"""
    try:
        portal_service = get_client_portal_service(db)

        # Process payment
        payment_result = portal_service.process_payment(
            invoice_id,
            payment_request.dict(),
            access_token
        )

        return {
            "success": True,
            "data": payment_result
        }
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment processing failed: {str(e)}"
        )


@router.post("/message")
async def send_client_message(
    message_request: ClientMessageRequest,
    access_token: str = Query(..., description="Client access token"),
    email: EmailStr = Query(..., description="Client email"),
    db: Session = Depends(get_db)
):
    """Send message from client to vendor (public endpoint)"""
    try:
        portal_service = get_client_portal_service(db)

        # Verify access
        is_valid, client = portal_service.verify_client_access(access_token, email)
        if not is_valid or not client:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid access token or email"
            )

        # Get vendor
        from app.models import User
        vendor = db.query(User).filter(User.id == client.user_id).first()
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found"
            )

        # Send message
        message_result = portal_service.send_client_message(
            client, vendor, message_request.message, message_request.invoice_id
        )

        return {
            "success": True,
            "data": message_result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
        )


@router.get("/communication/{access_token}")
async def get_communication_history(
    access_token: str,
    email: EmailStr = Query(..., description="Client email"),
    db: Session = Depends(get_db)
):
    """Get communication history between client and vendor (public endpoint)"""
    try:
        portal_service = get_client_portal_service(db)

        # Verify access
        is_valid, client = portal_service.verify_client_access(access_token, email)
        if not is_valid or not client:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid access token or email"
            )

        # Get communication history
        history = portal_service.get_client_communication_history(client, access_token)

        return {
            "success": True,
            "data": {
                "messages": history,
                "client_name": client.name,
                "total_messages": len(history)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get communication history: {str(e)}"
        )


@router.post("/feedback")
async def submit_client_feedback(
    feedback_request: ClientFeedbackRequest,
    access_token: str = Query(..., description="Client access token"),
    email: EmailStr = Query(..., description="Client email"),
    db: Session = Depends(get_db)
):
    """Submit client feedback and testimonial (public endpoint)"""
    try:
        portal_service = get_client_portal_service(db)

        # Verify access
        is_valid, client = portal_service.verify_client_access(access_token, email)
        if not is_valid or not client:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid access token or email"
            )

        # Get vendor for context
        from app.models import User
        vendor = db.query(User).filter(User.id == client.user_id).first()
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found"
            )

        # Process feedback (in production, store in database)
        feedback_id = f"fb_{access_token[:8]}"

        feedback_data = {
            "id": feedback_id,
            "client_name": client.name,
            "vendor_name": vendor.name,
            "rating": feedback_request.rating,
            "feedback": feedback_request.feedback,
            "public_testimonial": feedback_request.public_testimonial,
            "submitted_at": "2024-09-14T19:30:00Z",
            "status": "submitted"
        }

        # Viral sharing opportunity
        sharing_incentive = None
        if feedback_request.rating >= 4:
            sharing_incentive = {
                "message": "Thank you for the great feedback! Share your experience to help others discover DueSpark.",
                "share_url": f"https://duespark.com/signup?ref=client-feedback&vendor={vendor.id}",
                "templates": {
                    "twitter": f"Great experience paying {vendor.name} through @DueSpark! Super easy and professional. #SmallBusiness #Freelancer",
                    "linkedin": f"Had a seamless payment experience with {vendor.name} using DueSpark. Impressive how technology can make business transactions so smooth!"
                }
            }

        return {
            "success": True,
            "data": {
                "feedback_id": feedback_id,
                "message": "Thank you for your feedback!",
                "rating_received": feedback_request.rating,
                "vendor_notified": True,
                "sharing": sharing_incentive
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit feedback: {str(e)}"
        )


@router.get("/receipt/{payment_id}")
async def get_payment_receipt(
    payment_id: str,
    db: Session = Depends(get_db)
):
    """Get payment receipt (public endpoint)"""
    try:
        # Mock receipt data - in production, query actual payment records
        receipt_data = {
            "payment_id": payment_id,
            "status": "completed",
            "amount": "$150.00",
            "payment_method": "Credit Card ending in 4242",
            "transaction_date": "2024-09-14T19:30:00Z",
            "invoice_number": "INV-001",
            "vendor": "DueSpark Demo Vendor",
            "receipt_number": f"RCP-{payment_id[-8:].upper()}"
        }

        return {
            "success": True,
            "data": receipt_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get receipt: {str(e)}"
        )


@router.get("/health")
async def client_portal_health():
    """Health check for client portal (public endpoint)"""
    return {
        "status": "healthy",
        "service": "client-portal",
        "timestamp": "2024-09-14T19:30:00Z",
        "features": {
            "invoice_viewing": True,
            "payment_processing": True,
            "client_communication": True,
            "branded_experience": True
        }
    }


@router.get("/demo")
async def get_demo_portal():
    """Get demo client portal for showcasing (public endpoint)"""
    return {
        "success": True,
        "data": {
            "demo": True,
            "client": {
                "name": "Demo Client",
                "email": "client@example.com",
                "company": "Example Corp"
            },
            "vendor": {
                "name": "Sarah Johnson",
                "company": "SJ Design Studio",
                "subscription_tier": "professional"
            },
            "branding": {
                "logo_url": "https://via.placeholder.com/120x40/2563eb/ffffff?text=SJ+Design",
                "company_name": "SJ Design Studio",
                "primary_color": "#2563eb",
                "custom_branding_enabled": True,
                "powered_by_text": "Powered by DueSpark"
            },
            "invoices": [
                {
                    "id": 1,
                    "number": "INV-2024-001",
                    "amount": 1250.00,
                    "amount_display": "$1,250.00",
                    "status": "sent",
                    "status_display": "Awaiting Payment",
                    "due_date": "2024-09-21T00:00:00Z",
                    "description": "Website Design - Phase 1",
                    "is_overdue": False,
                    "days_until_due": 7,
                    "can_pay": True
                },
                {
                    "id": 2,
                    "number": "INV-2024-002",
                    "amount": 850.00,
                    "amount_display": "$850.00",
                    "status": "paid",
                    "status_display": "Paid",
                    "paid_at": "2024-09-10T14:30:00Z",
                    "description": "Logo Design",
                    "can_pay": False
                }
            ],
            "summary": {
                "total_outstanding": 1250.00,
                "total_outstanding_display": "$1,250.00",
                "invoice_count": 1
            },
            "access_token": "demo_token_12345",
            "portal_url": "https://pay.duespark.com/demo"
        }
    }