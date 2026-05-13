from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, Any
import logging
from datetime import datetime
import uuid

from .schemas import EventMessage, EventType
from .producer import get_producer

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/events", tags=["events"])


def get_routing_key(event_type: EventType) -> str:
    """Determine routing key based on event type"""
    return event_type.value


@router.post("/publish")
async def publish_event(
    event: EventMessage,
    background_tasks: BackgroundTasks,
) -> Dict[str, Any]:
    """Publish an event to RabbitMQ"""
    try:
        correlation_id = event.correlation_id or str(uuid.uuid4())
        routing_key = get_routing_key(event.event_type)
        
        # Prepare message
        message = {
            "event_type": event.event_type.value,
            "data": event.data,
            "source_service": event.source_service,
            "correlation_id": correlation_id,
            "metadata": event.metadata,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        # Get producer and publish
        from .producer import RabbitMQProducer
        producer = get_producer(
            host="rabbitmq",
            port=5672,
            user="admin",
            password="admin123"
        )
        
        # Publish to main exchange
        producer.publish(
            exchange="events",
            routing_key=routing_key,
            message=message
        )
        
        logger.info(f"Event published: {event.event_type} (correlation_id: {correlation_id})")
        
        return {
            "success": True,
            "message": "Event published successfully",
            "correlation_id": correlation_id,
            "event_type": event.event_type.value,
            "routing_key": routing_key,
        }
    except Exception as e:
        logger.error(f"Failed to publish event: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to publish event: {str(e)}")


@router.post("/user-created")
async def publish_user_created(data: Dict[str, Any]) -> Dict[str, Any]:
    """Publish user created event"""
    event = EventMessage(
        event_type=EventType.USER_CREATED,
        data=data,
        source_service="gateway-api"
    )
    return await publish_event(event, BackgroundTasks())


@router.post("/user-updated")
async def publish_user_updated(data: Dict[str, Any]) -> Dict[str, Any]:
    """Publish user updated event"""
    event = EventMessage(
        event_type=EventType.USER_UPDATED,
        data=data,
        source_service="gateway-api"
    )
    return await publish_event(event, BackgroundTasks())


@router.post("/appointment-created")
async def publish_appointment_created(data: Dict[str, Any]) -> Dict[str, Any]:
    """Publish appointment created event"""
    event = EventMessage(
        event_type=EventType.APPOINTMENT_CREATED,
        data=data,
        source_service="gateway-api"
    )
    return await publish_event(event, BackgroundTasks())


@router.post("/file-uploaded")
async def publish_file_uploaded(data: Dict[str, Any]) -> Dict[str, Any]:
    """Publish file uploaded event"""
    event = EventMessage(
        event_type=EventType.FILE_UPLOADED,
        data=data,
        source_service="gateway-api"
    )
    return await publish_event(event, BackgroundTasks())


@router.post("/medical-record-created")
async def publish_medical_record_created(data: Dict[str, Any]) -> Dict[str, Any]:
    """Publish medical record created event"""
    event = EventMessage(
        event_type=EventType.MEDICAL_RECORD_CREATED,
        data=data,
        source_service="gateway-api"
    )
    return await publish_event(event, BackgroundTasks())


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    return {"status": "healthy", "service": "gateway-api"}
