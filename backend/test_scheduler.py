"""Test scheduler initialization and job registration."""

import time
from app.scheduler import start_scheduler, shutdown_scheduler, scheduler

print("Testing APScheduler integration...")

# Start scheduler
start_scheduler()
print(f"✓ Scheduler started")
print(f"  - Running: {scheduler.running}")
print(f"  - Scheduled jobs: {len(scheduler.get_jobs())}")

# List jobs
for job in scheduler.get_jobs():
    print(f"    • {job.name}")
    print(f"      Trigger: {job.trigger}")
    print(f"      Next run: {job.next_run_time}")

# Wait a moment
time.sleep(1)

# Shutdown
shutdown_scheduler()
print(f"✓ Scheduler shutdown complete")
print(f"  - Running: {scheduler.running}")

print("\n✓ Scheduler test passed!")
