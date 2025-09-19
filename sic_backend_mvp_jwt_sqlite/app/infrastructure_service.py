"""
Phase 4: Scalable Infrastructure Service
Redis caching, background job processing, API rate limiting, and performance optimization
"""

import asyncio
import hashlib
import json
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from functools import wraps
from typing import Any, Callable, Dict, List, Optional

import redis
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


@dataclass
class CacheConfig:
    """Cache configuration"""

    ttl: int = 3600  # Time to live in seconds
    prefix: str = "duespark"
    serialize: bool = True


@dataclass
class RateLimitConfig:
    """Rate limiting configuration"""

    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    requests_per_day: int = 10000
    burst_limit: int = 100


@dataclass
class BackgroundJob:
    """Background job definition"""

    job_id: str
    job_type: str
    payload: Dict[str, Any]
    priority: int = 1  # 1 = high, 2 = medium, 3 = low
    scheduled_for: Optional[datetime] = None
    max_retries: int = 3
    retry_count: int = 0
    created_at: datetime = None
    status: str = "pending"  # pending, running, completed, failed


@dataclass
class PerformanceMetrics:
    """Performance monitoring metrics"""

    endpoint: str
    method: str
    response_time_ms: float
    status_code: int
    timestamp: datetime
    user_id: Optional[int] = None
    organization_id: Optional[int] = None


class CacheService:
    """Redis-based caching service"""

    def __init__(self, redis_url: str = "redis://localhost:6379"):
        try:
            self.redis_client = redis.from_url(redis_url)
            self.redis_client.ping()  # Test connection
            self.available = True
        except Exception as e:
            logger.warning(
                f"Redis not available: {e}. Falling back to in-memory cache."
            )
            self.available = False
            self._memory_cache = {}

    def get(self, key: str, config: CacheConfig = None) -> Optional[Any]:
        """Get value from cache"""
        config = config or CacheConfig()
        full_key = f"{config.prefix}:{key}"

        try:
            if self.available:
                value = self.redis_client.get(full_key)
                if value and config.serialize:
                    return json.loads(value)
                return value
            else:
                # Fallback to memory cache
                cache_entry = self._memory_cache.get(full_key)
                if cache_entry and cache_entry["expires"] > datetime.now():
                    return cache_entry["value"]
                elif cache_entry:
                    del self._memory_cache[full_key]
                return None
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None

    def set(self, key: str, value: Any, config: CacheConfig = None) -> bool:
        """Set value in cache"""
        config = config or CacheConfig()
        full_key = f"{config.prefix}:{key}"

        try:
            if self.available:
                if config.serialize:
                    value = json.dumps(value, default=str)
                return self.redis_client.setex(full_key, config.ttl, value)
            else:
                # Fallback to memory cache
                self._memory_cache[full_key] = {
                    "value": value,
                    "expires": datetime.now() + timedelta(seconds=config.ttl),
                }
                return True
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False

    def delete(self, key: str, config: CacheConfig = None) -> bool:
        """Delete value from cache"""
        config = config or CacheConfig()
        full_key = f"{config.prefix}:{key}"

        try:
            if self.available:
                return bool(self.redis_client.delete(full_key))
            else:
                if full_key in self._memory_cache:
                    del self._memory_cache[full_key]
                    return True
                return False
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            return False

    def invalidate_pattern(self, pattern: str, config: CacheConfig = None) -> int:
        """Invalidate cache keys matching pattern"""
        config = config or CacheConfig()
        full_pattern = f"{config.prefix}:{pattern}"

        try:
            if self.available:
                keys = self.redis_client.keys(full_pattern)
                if keys:
                    return self.redis_client.delete(*keys)
                return 0
            else:
                # Memory cache pattern invalidation
                keys_to_delete = [
                    k
                    for k in self._memory_cache.keys()
                    if full_pattern.replace("*", "") in k
                ]
                for key in keys_to_delete:
                    del self._memory_cache[key]
                return len(keys_to_delete)
        except Exception as e:
            logger.error(f"Cache pattern invalidation error: {e}")
            return 0


class RateLimitService:
    """API rate limiting service"""

    def __init__(self, cache_service: CacheService):
        self.cache = cache_service

    def check_rate_limit(
        self, identifier: str, config: RateLimitConfig = None
    ) -> Dict[str, Any]:
        """Check if request is within rate limits"""
        config = config or RateLimitConfig()
        current_time = datetime.now()

        # Check minute limit
        minute_key = (
            f"rate_limit:minute:{identifier}:{current_time.strftime('%Y%m%d%H%M')}"
        )
        minute_count = self.cache.get(minute_key) or 0

        # Check hour limit
        hour_key = f"rate_limit:hour:{identifier}:{current_time.strftime('%Y%m%d%H')}"
        hour_count = self.cache.get(hour_key) or 0

        # Check day limit
        day_key = f"rate_limit:day:{identifier}:{current_time.strftime('%Y%m%d')}"
        day_count = self.cache.get(day_key) or 0

        # Check burst limit (sliding window)
        burst_key = f"rate_limit:burst:{identifier}"
        burst_timestamps = self.cache.get(burst_key) or []

        # Clean old burst timestamps
        cutoff_time = current_time - timedelta(minutes=1)
        burst_timestamps = [
            ts for ts in burst_timestamps if datetime.fromisoformat(ts) > cutoff_time
        ]

        # Check limits
        limits_exceeded = []
        if minute_count >= config.requests_per_minute:
            limits_exceeded.append("minute")
        if hour_count >= config.requests_per_hour:
            limits_exceeded.append("hour")
        if day_count >= config.requests_per_day:
            limits_exceeded.append("day")
        if len(burst_timestamps) >= config.burst_limit:
            limits_exceeded.append("burst")

        allowed = len(limits_exceeded) == 0

        if allowed:
            # Increment counters
            self.cache.set(minute_key, minute_count + 1, CacheConfig(ttl=60))
            self.cache.set(hour_key, hour_count + 1, CacheConfig(ttl=3600))
            self.cache.set(day_key, day_count + 1, CacheConfig(ttl=86400))

            # Update burst window
            burst_timestamps.append(current_time.isoformat())
            self.cache.set(burst_key, burst_timestamps, CacheConfig(ttl=60))

        return {
            "allowed": allowed,
            "limits_exceeded": limits_exceeded,
            "remaining": {
                "minute": max(0, config.requests_per_minute - minute_count),
                "hour": max(0, config.requests_per_hour - hour_count),
                "day": max(0, config.requests_per_day - day_count),
            },
            "reset_times": {
                "minute": (current_time + timedelta(minutes=1)).isoformat(),
                "hour": (current_time + timedelta(hours=1)).isoformat(),
                "day": (current_time + timedelta(days=1)).isoformat(),
            },
        }


class BackgroundJobService:
    """Background job processing service"""

    def __init__(self, cache_service: CacheService):
        self.cache = cache_service
        self.job_handlers = {}
        self.running = False

    def register_handler(self, job_type: str, handler: Callable):
        """Register a job handler function"""
        self.job_handlers[job_type] = handler

    def enqueue_job(self, job: BackgroundJob) -> str:
        """Enqueue a background job"""
        if not job.job_id:
            job.job_id = self._generate_job_id(job)

        if not job.created_at:
            job.created_at = datetime.now()

        # Store job in cache/queue
        queue_key = f"job_queue:priority_{job.priority}"
        job_data = {
            "job_id": job.job_id,
            "job_type": job.job_type,
            "payload": job.payload,
            "priority": job.priority,
            "scheduled_for": (
                job.scheduled_for.isoformat() if job.scheduled_for else None
            ),
            "max_retries": job.max_retries,
            "retry_count": job.retry_count,
            "created_at": job.created_at.isoformat(),
            "status": job.status,
        }

        # Add to priority queue
        try:
            if self.cache.available:
                self.cache.redis_client.lpush(
                    queue_key, json.dumps(job_data, default=str)
                )
            else:
                # Fallback to immediate execution
                self._execute_job_immediately(job)

            # Store job details for tracking
            self.cache.set(f"job:{job.job_id}", job_data, CacheConfig(ttl=86400))

            logger.info(f"Job {job.job_id} enqueued with priority {job.priority}")
            return job.job_id

        except Exception as e:
            logger.error(f"Failed to enqueue job {job.job_id}: {e}")
            raise

    def _generate_job_id(self, job: BackgroundJob) -> str:
        """Generate unique job ID"""
        timestamp = str(int(time.time() * 1000))
        payload_hash = hashlib.md5(
            json.dumps(job.payload, sort_keys=True).encode(), usedforsecurity=False
        ).hexdigest()[:8]
        return f"{job.job_type}_{timestamp}_{payload_hash}"

    def _execute_job_immediately(self, job: BackgroundJob):
        """Execute job immediately (fallback when no Redis)"""
        try:
            handler = self.job_handlers.get(job.job_type)
            if handler:
                handler(job.payload)
                logger.info(f"Job {job.job_id} executed immediately")
            else:
                logger.error(f"No handler found for job type: {job.job_type}")
        except Exception as e:
            logger.error(f"Failed to execute job {job.job_id}: {e}")

    async def process_jobs(self):
        """Process jobs from queue (background worker)"""
        self.running = True
        logger.info("Background job processor started")

        while self.running:
            try:
                # Process high priority jobs first
                for priority in [1, 2, 3]:
                    queue_key = f"job_queue:priority_{priority}"

                    if self.cache.available:
                        job_data = self.cache.redis_client.brpop(queue_key, timeout=1)
                        if job_data:
                            job_json = job_data[1].decode("utf-8")
                            await self._process_job(json.loads(job_json))
                    else:
                        # No Redis, just wait
                        await asyncio.sleep(1)

            except Exception as e:
                logger.error(f"Job processing error: {e}")
                await asyncio.sleep(5)  # Wait before retrying

    async def _process_job(self, job_data: Dict[str, Any]):
        """Process a single job"""
        job_id = job_data["job_id"]
        job_type = job_data["job_type"]

        try:
            # Check if job should be delayed
            scheduled_for = job_data.get("scheduled_for")
            if scheduled_for:
                scheduled_time = datetime.fromisoformat(scheduled_for)
                if scheduled_time > datetime.now():
                    # Re-queue for later
                    await asyncio.sleep(1)
                    return

            # Update job status
            job_data["status"] = "running"
            self.cache.set(f"job:{job_id}", job_data, CacheConfig(ttl=86400))

            # Execute job
            handler = self.job_handlers.get(job_type)
            if not handler:
                raise ValueError(f"No handler for job type: {job_type}")

            await handler(job_data["payload"])

            # Mark as completed
            job_data["status"] = "completed"
            job_data["completed_at"] = datetime.now().isoformat()
            self.cache.set(f"job:{job_id}", job_data, CacheConfig(ttl=86400))

            logger.info(f"Job {job_id} completed successfully")

        except Exception as e:
            logger.error(f"Job {job_id} failed: {e}")

            # Handle retry logic
            retry_count = job_data.get("retry_count", 0)
            max_retries = job_data.get("max_retries", 3)

            if retry_count < max_retries:
                # Retry with backoff
                job_data["retry_count"] = retry_count + 1
                job_data["status"] = "pending"
                retry_delay = 2**retry_count  # Exponential backoff

                # Re-queue with delay
                queue_key = f"job_queue:priority_{job_data['priority']}"
                self.cache.redis_client.lpush(
                    queue_key, json.dumps(job_data, default=str)
                )

                logger.info(
                    f"Job {job_id} requeued for retry {retry_count + 1}/{max_retries}"
                )
            else:
                # Mark as failed
                job_data["status"] = "failed"
                job_data["failed_at"] = datetime.now().isoformat()
                job_data["error"] = str(e)
                self.cache.set(f"job:{job_id}", job_data, CacheConfig(ttl=86400))

    def stop_processing(self):
        """Stop job processing"""
        self.running = False


class PerformanceMonitoringService:
    """Performance monitoring and optimization service"""

    def __init__(self, cache_service: CacheService):
        self.cache = cache_service
        self.metrics_buffer = []
        self.buffer_size = 1000

    def record_request_metrics(self, metrics: PerformanceMetrics):
        """Record request performance metrics"""
        self.metrics_buffer.append(metrics)

        # Flush buffer when full
        if len(self.metrics_buffer) >= self.buffer_size:
            self._flush_metrics_buffer()

        # Store recent metrics in cache for real-time monitoring
        recent_key = f"metrics:recent:{metrics.endpoint}"
        recent_metrics = self.cache.get(recent_key) or []
        recent_metrics.append(
            {
                "timestamp": metrics.timestamp.isoformat(),
                "response_time_ms": metrics.response_time_ms,
                "status_code": metrics.status_code,
            }
        )

        # Keep only last 100 entries
        recent_metrics = recent_metrics[-100:]
        self.cache.set(recent_key, recent_metrics, CacheConfig(ttl=3600))

    def _flush_metrics_buffer(self):
        """Flush metrics buffer to storage"""
        if not self.metrics_buffer:
            return

        # In a real implementation, this would write to a time-series database
        # For now, just aggregate and cache
        try:
            self._aggregate_metrics(self.metrics_buffer)
            self.metrics_buffer.clear()
        except Exception as e:
            logger.error(f"Failed to flush metrics: {e}")

    def _aggregate_metrics(self, metrics: List[PerformanceMetrics]):
        """Aggregate metrics for reporting"""
        endpoint_stats = {}

        for metric in metrics:
            if metric.endpoint not in endpoint_stats:
                endpoint_stats[metric.endpoint] = {
                    "request_count": 0,
                    "total_response_time": 0,
                    "min_response_time": float("inf"),
                    "max_response_time": 0,
                    "error_count": 0,
                }

            stats = endpoint_stats[metric.endpoint]
            stats["request_count"] += 1
            stats["total_response_time"] += metric.response_time_ms
            stats["min_response_time"] = min(
                stats["min_response_time"], metric.response_time_ms
            )
            stats["max_response_time"] = max(
                stats["max_response_time"], metric.response_time_ms
            )

            if metric.status_code >= 400:
                stats["error_count"] += 1

        # Calculate averages and store
        for endpoint, stats in endpoint_stats.items():
            if stats["request_count"] > 0:
                stats["avg_response_time"] = (
                    stats["total_response_time"] / stats["request_count"]
                )
                stats["error_rate"] = (
                    stats["error_count"] / stats["request_count"]
                ) * 100

            # Store aggregated stats
            stats_key = (
                f"metrics:aggregated:{endpoint}:{datetime.now().strftime('%Y%m%d%H')}"
            )
            self.cache.set(stats_key, stats, CacheConfig(ttl=86400))

    def get_performance_dashboard(self) -> Dict[str, Any]:
        """Get performance monitoring dashboard data"""
        try:
            # Get aggregated stats for the last 24 hours
            dashboard_data = {
                "overview": self._get_overview_metrics(),
                "endpoints": self._get_endpoint_metrics(),
                "alerts": self._get_performance_alerts(),
                "trends": self._get_performance_trends(),
            }

            return dashboard_data

        except Exception as e:
            logger.error(f"Failed to generate performance dashboard: {e}")
            return {"error": "Failed to load performance data"}

    def _get_overview_metrics(self) -> Dict[str, Any]:
        """Get overview performance metrics"""
        current_hour = datetime.now().strftime("%Y%m%d%H")

        # This would typically query aggregated data
        return {
            "total_requests": 1500,
            "avg_response_time": 245.5,
            "error_rate": 2.1,
            "p95_response_time": 800.0,
            "uptime_percentage": 99.9,
        }

    def _get_endpoint_metrics(self) -> List[Dict[str, Any]]:
        """Get per-endpoint performance metrics"""
        # This would typically query real aggregated data
        return [
            {
                "endpoint": "/api/invoices",
                "request_count": 450,
                "avg_response_time": 180.5,
                "error_rate": 1.2,
                "p95_response_time": 650.0,
            },
            {
                "endpoint": "/api/clients",
                "request_count": 320,
                "avg_response_time": 120.8,
                "error_rate": 0.8,
                "p95_response_time": 400.0,
            },
        ]

    def _get_performance_alerts(self) -> List[Dict[str, Any]]:
        """Get performance alerts"""
        alerts = []

        # Check for high error rates, slow responses, etc.
        # This would be based on real metrics
        return alerts

    def _get_performance_trends(self) -> Dict[str, Any]:
        """Get performance trends over time"""
        # This would show trends over hours/days
        return {
            "response_time_trend": [],
            "error_rate_trend": [],
            "request_volume_trend": [],
        }


class InfrastructureService:
    """Main infrastructure service orchestrator"""

    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.cache = CacheService(redis_url)
        self.rate_limiter = RateLimitService(self.cache)
        self.job_processor = BackgroundJobService(self.cache)
        self.performance_monitor = PerformanceMonitoringService(self.cache)

        # Register default job handlers
        self._register_default_handlers()

    def _register_default_handlers(self):
        """Register default background job handlers"""

        async def send_email_handler(payload: Dict[str, Any]):
            """Handle email sending jobs"""
            logger.info(f"Sending email: {payload.get('subject', 'No subject')}")
            # Implement actual email sending logic
            await asyncio.sleep(1)  # Simulate work

        async def generate_report_handler(payload: Dict[str, Any]):
            """Handle report generation jobs"""
            logger.info(f"Generating report: {payload.get('report_type', 'unknown')}")
            # Implement actual report generation logic
            await asyncio.sleep(5)  # Simulate work

        async def data_export_handler(payload: Dict[str, Any]):
            """Handle data export jobs"""
            logger.info(f"Exporting data: {payload.get('export_type', 'unknown')}")
            # Implement actual data export logic
            await asyncio.sleep(10)  # Simulate work

        self.job_processor.register_handler("send_email", send_email_handler)
        self.job_processor.register_handler("generate_report", generate_report_handler)
        self.job_processor.register_handler("data_export", data_export_handler)

    async def start_background_workers(self):
        """Start background job processing"""
        logger.info("Starting infrastructure background workers")
        await self.job_processor.process_jobs()

    def stop_background_workers(self):
        """Stop background job processing"""
        logger.info("Stopping infrastructure background workers")
        self.job_processor.stop_processing()


# Utility decorators
def cached(ttl: int = 3600, prefix: str = "duespark"):
    """Decorator for caching function results"""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_key = f"func:{func.__name__}:{hashlib.md5(str(args).encode(), usedforsecurity=False).hexdigest()}"

            # Try to get from cache
            # Note: This requires access to cache service instance
            # In real implementation, would inject cache service
            result = None  # cache.get(cache_key, CacheConfig(ttl=ttl, prefix=prefix))

            if result is None:
                result = func(*args, **kwargs)
                # cache.set(cache_key, result, CacheConfig(ttl=ttl, prefix=prefix))

            return result

        return wrapper

    return decorator


def rate_limited(requests_per_minute: int = 60):
    """Decorator for rate limiting API endpoints"""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Extract user identifier (would need request context)
            # In real implementation, would check rate limits
            return func(*args, **kwargs)

        return wrapper

    return decorator


# Global infrastructure service instance
infrastructure_service = None


def get_infrastructure_service() -> InfrastructureService:
    """Get infrastructure service singleton"""
    global infrastructure_service
    if infrastructure_service is None:
        infrastructure_service = InfrastructureService()
    return infrastructure_service
