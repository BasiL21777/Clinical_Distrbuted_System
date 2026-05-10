from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
import bcrypt
from ..core.config import settings

def hash_password(password: str) -> str:
    """تشفير كلمة المرور باستخدام bcrypt (Task 2)[cite: 1, 2]"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """التحقق من كلمة المرور (Task 2)[cite: 1, 2]"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict):
    """إنشاء Access Token قصير المدى (Task 1)[cite: 1, 2]"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(data: dict):
    """إنشاء Refresh Token طويل المدى (Task 1 Advanced)[cite: 1]"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)