# auth-service/app/models/user.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)   
    full_name = Column(String, nullable=False)
    
    # حقول الهوية الخارجية
    github_id = Column(String, unique=True, nullable=True)
    google_id = Column(String, unique=True, nullable=True) 
    
    # العمود الجديد
    auth_provider = Column(String, default="local", nullable=False) # local, google, github
    
    role = Column(String, default="patient", nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<User {self.email} - {self.role}>"