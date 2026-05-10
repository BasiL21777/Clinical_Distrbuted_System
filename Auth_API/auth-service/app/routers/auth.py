# auth-service/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from jose import JWTError, jwt

from ..core.database import get_db
from ..core.security import hash_password, verify_password, create_access_token, create_refresh_token
from ..core.config import settings       
from ..models.user import User
from ..schemas.user import UserCreate, UserLogin, Token
from ..dependencies.auth import get_current_user_data, require_role
from ..utils.system_logger import log_event   # Fixed import

router = APIRouter(prefix="/auth", tags=["auth"])


# ====================== Public Routes ======================

@router.post("/register")
async def register(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        await log_event(
            db, request, 
            action="USER_REGISTER_FAILED", 
            details=f"Registration attempt failed: Email {user.email} already exists", 
            status_code=400, 
            success=False
        )
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_user = User(
        email=user.email,
        hashed_password=hash_password(user.password), 
        full_name=user.full_name,
        role="patient",
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    await log_event(
        db, request, 
        action="USER_REGISTER", 
        user_id=db_user.id, 
        user_role=db_user.role,
        resource_type="User",
        resource_id=str(db_user.id),
        details="New user registered successfully"
    )
    
    return {"msg": "User created successfully", "role": db_user.role}


@router.post("/login", response_model=Token)
async def login(request: Request, user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        await log_event(
            db, request, 
            action="USER_LOGIN_FAILED", 
            details=f"Invalid login attempt for email: {user.email}", 
            status_code=401, 
            success=False
        )
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token({
        "sub": str(db_user.id), 
        "role": db_user.role,
        "email": db_user.email
    })
    refresh_token = create_refresh_token({"sub": str(db_user.id)})
    
    await log_event(
        db, request, 
        action="USER_LOGIN", 
        user_id=db_user.id, 
        user_role=db_user.role,
        details="Standard email/password login"
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/refresh")
async def refresh_token(request: Request, refresh_token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(refresh_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == int(user_id)).first()
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        new_access = create_access_token({
            "sub": str(user.id), 
            "role": user.role, 
            "email": user.email
        })

        await log_event(
            db, request, 
            action="TOKEN_REFRESH", 
            user_id=user.id, 
            user_role=user.role
        )
        
        return {"access_token": new_access, "token_type": "bearer"}
        
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Token expired or invalid")


# ====================== Protected Routes ======================

@router.patch("/update-role/{user_id}")
async def update_user_role(
    request: Request,
    user_id: int, 
    new_role: str, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(require_role("admin")) 
):
    valid_roles = ["patient", "doctor", "admin"]
    if new_role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role specified")

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = target_user.role
    target_user.role = new_role
    db.commit()

    await log_event(
        db, request,
        action="USER_ROLE_UPDATED",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        resource_type="User",
        resource_id=str(user_id),
        details=f"Admin {current_user.get('email')} changed {target_user.email} from {old_role} to {new_role}"
    )

    return {
        "msg": "Role updated successfully",
        "user_email": target_user.email,
        "new_role": target_user.role
    }


@router.post("/logout")
async def logout(request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user_data)):
    await log_event(
        db, request, 
        action="USER_LOGOUT", 
        user_id=current_user.get("user_id"), 
        user_role=current_user.get("role"),
        details="User logged out session"
    )
    return {"msg": "Logged out successfully"}


@router.get("/me")
def get_current_user_info(current_user: dict = Depends(get_current_user_data)):
    return {
        "id": current_user.get("user_id"),
        "email": current_user.get("email"),
        "role": current_user.get("role")
    }


@router.get("/profile")
def get_profile(current_user: dict = Depends(get_current_user_data)):
    return {
        "message": "This is your profile",
        "user": current_user
    }


@router.get("/admin-only")
def admin_only(current_user: dict = Depends(require_role("admin"))):
    return {"msg": f"Welcome Admin {current_user.get('email')}! You have full access."}


@router.get("/doctor-only")
def doctor_only(current_user: dict = Depends(require_role("doctor"))):
    return {"msg": "Welcome Doctor! You can manage appointments and patients."}


@router.get("/patient-only")
def patient_only(current_user: dict = Depends(require_role("patient"))):
    return {"msg": "Welcome Patient! This is your personal area."}