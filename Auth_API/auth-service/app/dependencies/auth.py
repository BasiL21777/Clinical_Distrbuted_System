# app/dependencies/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from ..core.config import settings

security = HTTPBearer()

def get_current_user_data(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    التحقق من صحة التوكن واستخراج البيانات (User ID, Email & Role)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    
    try:
        token = credentials.credentials
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        # sub يحتوي الآن على المعرف الرقمي (User ID)
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        role: str = payload.get("role")
        token_type: str = payload.get("type")

        if user_id is None or token_type != "access":
            raise credentials_exception
            
        return {
            "user_id": user_id, 
            "email": email, 
            "role": role
        }
        
    except JWTError:
        raise credentials_exception

def require_role(required_role: str):
    def role_checker(user_data: dict = Depends(get_current_user_data)):
        if user_data.get("role") != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: {required_role} role required"
            )
        return user_data
    return role_checker