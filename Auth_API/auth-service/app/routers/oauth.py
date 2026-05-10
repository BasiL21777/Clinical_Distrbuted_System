from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import httpx

from ..core.config import settings
from ..core.database import get_db
from ..core.security import create_access_token
from ..models.user import User
from ..utils.system_logger import log_event

router = APIRouter(prefix="/auth", tags=["oauth"])


# ====================== GitHub OAuth ======================
@router.get("/github/login")
def github_login():
    return RedirectResponse(
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={settings.GITHUB_CALLBACK_URL}"
        f"&scope=user:email"
    )


@router.get("/github/callback")
async def github_callback(request: Request, code: str, db: Session = Depends(get_db)):
    return await handle_oauth_callback("github", code, db, request)


# ====================== Google OAuth ======================
@router.get("/google/login")
def google_login():
    return RedirectResponse(
        f"https://accounts.google.com/o/oauth2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_CALLBACK_URL}"
        f"&response_type=code"
        f"&scope=openid email profile"
    )


@router.get("/google/callback")
async def google_callback(request: Request, code: str, db: Session = Depends(get_db)):
    return await handle_oauth_callback("google", code, db, request)


# ====================== Common Handler ======================
async def handle_oauth_callback(provider: str, code: str, db: Session, request: Request):
    if not code:
        raise HTTPException(400, "No code provided")

    if provider == "github":
        token_url = "https://github.com/login/oauth/access_token"
        user_url = "https://api.github.com/user"
        email_url = "https://api.github.com/user/emails"
        headers = {"Accept": "application/json"}
        token_data = {
            "client_id": settings.GITHUB_CLIENT_ID, 
            "client_secret": settings.GITHUB_CLIENT_SECRET, 
            "code": code
        }

    elif provider == "google":
        token_url = "https://oauth2.googleapis.com/token"
        user_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        token_data = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.GOOGLE_CALLBACK_URL
        }
        headers = {}

    async with httpx.AsyncClient() as client:
        # 1. الحصول على Access Token
        token_response = await client.post(token_url, json=token_data, headers=headers)
        token_info = token_response.json()

        access_token = token_info.get("access_token")
        if not access_token:
            raise HTTPException(400, f"Failed to get access token from {provider}")

        # 2. الحصول على بيانات المستخدم
        user_response = await client.get(user_url, headers={"Authorization": f"Bearer {access_token}"})
        user_info = user_response.json()

        email = user_info.get("email")
        
        # جلب الإيميل الخاص بجيت هاب إذا لم يكن عاماً (Private)
        if not email and provider == "github":
            email_res = await client.get(email_url, headers={"Authorization": f"token {access_token}"})
            emails = email_res.json()
            email = next((e["email"] for e in emails if e.get("primary")), None)

    if not email:
        raise HTTPException(400, f"Could not get email from {provider}")

    # 3. البحث عن المستخدم أو إنشاؤه
    db_user = db.query(User).filter(User.email == email).first()

    # استخراج المعرفات (IDs) بدقة
    current_github_id = str(user_info.get("id")) if provider == "github" else None
    current_google_id = str(user_info.get("id") or user_info.get("sub")) if provider == "google" else None

    if not db_user:
        # إنشاء مستخدم جديد وتحديد الـ Provider والـ ID
        db_user = User(
            email=email,
            full_name=user_info.get("name") or user_info.get("login") or "User",
            github_id=current_github_id,
            google_id=current_google_id,
            auth_provider=provider,
            role="patient",
            is_active=True
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
    else:
        # ربط الحساب إذا كان موجوداً مسبقاً
        is_updated = False
        if provider == "github" and not db_user.github_id:
            db_user.github_id = current_github_id
            db_user.auth_provider = provider
            is_updated = True
        elif provider == "google" and not db_user.google_id:
            db_user.google_id = current_google_id
            db_user.auth_provider = provider
            is_updated = True
        
        if is_updated:
            db.commit()

    # 4. توليد JWT Token بحيث يكون sub هو المعرف الرقمي
    token = create_access_token({
        "sub": str(db_user.id), 
        "role": db_user.role,
        "email": db_user.email
    })

    # 5. تسجيل الدخول في سجلات النظام
    await log_event(
        db, request, 
        action=f"USER_LOGIN_{provider.upper()}", 
        user_id=db_user.id, 
        user_role=db_user.role,
        details=f"Successful OAuth login using {provider}"
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "provider": provider,
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "name": db_user.full_name,
            "role": db_user.role,
            "auth_provider": db_user.auth_provider
        }
    }