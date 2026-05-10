import os
from datetime import datetime, timezone
from fastapi import Request
from sqlalchemy.orm import Session
from app.models.system_log import SystemLog

async def log_event(
    db: Session, 
    request: Request, 
    action: str, 
    status_code: int = 200, 
    success: bool = True, 
    details: str = None,
    resource_type: str = None,
    resource_id: str = None,
    user_id: int = None,
    user_role: str = None
):
    try:
        if user_id is None:
            user = getattr(request.state, "user", None)
            user_id = user.id if user else None
            user_role = user.role if user else None

        new_log = SystemLog(
            service_name=os.getenv("SERVICE_NAME", "Auth_Service"),
            user_id=user_id,
            user_role=user_role,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            method=request.method,
            endpoint=str(request.url.path),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            status_code=status_code,
            details=details,
            success=success,
            created_at=datetime.now(timezone.utc)   # set explicitly — never null
        )
        
        db.add(new_log)
        db.commit()
    except Exception as e:
        print(f"Logging failed: {str(e)}")
        db.rollback()