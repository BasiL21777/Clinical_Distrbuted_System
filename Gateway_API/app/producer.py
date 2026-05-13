import pika
import json
import logging
from typing import Dict, Any
from functools import lru_cache

logger = logging.getLogger(__name__)

class RabbitMQProducer:
    """RabbitMQ Producer wrapper for publishing messages to queues"""
    
    def __init__(self, host: str, port: int, user: str, password: str, vhost: str = "/"):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.vhost = vhost
        self.connection = None
        self.channel = None
        self.connect()
    
    def connect(self):
        """Establish connection to RabbitMQ"""
        try:
            credentials = pika.PlainCredentials(self.user, self.password)
            parameters = pika.ConnectionParameters(
                host=self.host,
                port=self.port,
                virtual_host=self.vhost,
                credentials=credentials,
                connection_attempts=3,
                retry_delay=2
            )
            self.connection = pika.BlockingConnection(parameters)
            self.channel = self.connection.channel()
            logger.info(f"Connected to RabbitMQ at {self.host}:{self.port}")
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            raise
    
    def declare_exchange(self, exchange_name: str, exchange_type: str = "direct"):
        """Declare an exchange"""
        try:
            self.channel.exchange_declare(
                exchange=exchange_name,
                exchange_type=exchange_type,
                durable=True
            )
            logger.info(f"Declared exchange: {exchange_name}")
        except Exception as e:
            logger.error(f"Failed to declare exchange {exchange_name}: {e}")
    
    def declare_queue(self, queue_name: str):
        """Declare a queue"""
        try:
            self.channel.queue_declare(queue=queue_name, durable=True)
            logger.info(f"Declared queue: {queue_name}")
        except Exception as e:
            logger.error(f"Failed to declare queue {queue_name}: {e}")
    
    def bind_queue(self, queue_name: str, exchange_name: str, routing_key: str):
        """Bind a queue to an exchange"""
        try:
            self.channel.queue_bind(
                queue=queue_name,
                exchange=exchange_name,
                routing_key=routing_key
            )
            logger.info(f"Bound queue {queue_name} to exchange {exchange_name}")
        except Exception as e:
            logger.error(f"Failed to bind queue: {e}")
    
    def publish(self, exchange: str, routing_key: str, message: Dict[str, Any], durable: bool = True):
        """Publish a message to an exchange"""
        try:
            self.channel.basic_publish(
                exchange=exchange,
                routing_key=routing_key,
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    content_type="application/json",
                    delivery_mode=2 if durable else 1  # 2 = persistent, 1 = non-persistent
                )
            )
            logger.info(f"Published message to {exchange} with routing_key {routing_key}")
        except Exception as e:
            logger.error(f"Failed to publish message: {e}")
            raise
    
    def close(self):
        """Close the RabbitMQ connection"""
        if self.connection and not self.connection.is_closed:
            self.connection.close()
            logger.info("RabbitMQ connection closed")


@lru_cache(maxsize=1)
def get_producer(host: str, port: int, user: str, password: str, vhost: str = "/") -> RabbitMQProducer:
    """Get or create a singleton RabbitMQ producer instance"""
    return RabbitMQProducer(host, port, user, password, vhost)
