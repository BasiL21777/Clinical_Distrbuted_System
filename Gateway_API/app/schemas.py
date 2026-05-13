from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class EventType(str, Enum):
    """Event types for different message categories"""
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    USER_DELETED = "user.deleted"
    USER_LOGIN = "user.login"
    USER_LOGOUT = "user.logout"
    
    APPOINTMENT_CREATED = "appointment.created"
    APPOINTMENT_UPDATED = "appointment.updated"
    APPOINTMENT_CANCELLED = "appointment.cancelled"
    
    FILE_UPLOADED = "file.uploaded"
    FILE_DELETED = "file.deleted"
    FILE_ACCESSED = "file.accessed"
    
    MEDICAL_RECORD_CREATED = "medical_record.created"
    MEDICAL_RECORD_UPDATED = "medical_record.updated"


class BaseEvent(BaseModel):
    """Base event schema"""
    event_type: EventType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source_service: str
    correlation_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class UserEvent(BaseEvent):
    """User-related events"""
    user_id: str
    email: Optional[str] = None
    username: Optional[str] = None
    role: Optional[str] = None


class AppointmentEvent(BaseEvent):
    """Appointment-related events"""
    appointment_id: str
    user_id: str
    doctor_id: Optional[str] = None
    scheduled_date: Optional[str] = None
    status: Optional[str] = None


class FileEvent(BaseEvent):
    """File-related events"""
    file_id: str
    user_id: str
    file_name: str
    file_size: Optional[int] = None
    content_type: Optional[str] = None


class MedicalRecordEvent(BaseEvent):
    """Medical record events"""
    record_id: str
    patient_id: str
    doctor_id: Optional[str] = None
    record_type: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)


class EventMessage(BaseModel):
    """Generic event message for publishing"""
    event_type: EventType
    data: Dict[str, Any]
    source_service: str = "gateway-api"
    correlation_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
