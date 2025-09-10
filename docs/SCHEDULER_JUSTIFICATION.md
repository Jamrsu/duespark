Scheduler Choice: APScheduler vs. Celery + Redis

Summary
- For this MVP, we chose APScheduler (in-process) with Postgres advisory locks to provide idempotent, exactly-once reminder sending and nightly adaptive scheduling without introducing extra infrastructure.
- Celery + Redis remains the preferred choice at scale for durable distributed execution, robust retries, and clearer separation of concerns. The current design keeps a straightforward migration path to Celery when needed.

Tradeoffs
- Simplicity (APScheduler):
  - Pros: Zero extra services; easy local/dev; fewer moving parts; quick to reason about.
  - Cons: In-process lifecycle; less resilient to process/node restarts; retries/DLQ are hand-rolled.
- Durability & Scale (Celery + Redis):
  - Pros: Distributed workers; brokered retries with backoff; result backends; strong patterns for idempotency (SETNX) and observability.
  - Cons: Operational overhead (broker + beat + workers); additional security/monitoring; more config.

Exactly-Once & Concurrency
- Implemented now: Postgres `pg_try_advisory_lock` plus status checks to ensure only one sender processes a reminder. Optional Redis locks (SETNX) can be enabled with `REDIS_URL` to mirror Celery patterns.
- Migration: Celery tasks would use Redis SETNX locks for both enqueue and processing, mirroring this logic.

Retries & DLQ
- Implemented now: On failure, reminders are marked `failed`, and DLQ rows are created for terminal errors. Admin endpoint can requeue failed items.
- Migration: Celery’s built-in retries/backoffs would replace the custom backoff; DLQ rows can still be recorded for visibility and manual intervention.

Observability
- Prometheus counters/histograms/gauges expose job runs, send durations, adaptive durations, and DLQ counts. These map cleanly to task-level metrics in Celery as well.

Migration Path (when scaling up)
1) Introduce Redis and Celery worker/beat.
2) Extract APScheduler jobs into Celery tasks: `send_reminder_task`, `compute_adaptive_schedules_task`, and a poller that enqueues due reminders.
3) Keep idempotency keys and DLQ topics stable to preserve exactly-once semantics and debugging familiarity.
4) Horizontally scale workers; keep nightly adaptive under leader election or a single beat process.

Conclusion
- APScheduler satisfies the MVP acceptance with minimal ops burden and keeps the code structured to graduate to Celery + Redis as concurrency and reliability requirements grow.

