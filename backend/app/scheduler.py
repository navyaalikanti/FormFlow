"""Background scheduler for data retention archival jobs."""

import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config.settings import settings
from app.services.retention_service import RetentionService

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(daemon=True)


def get_db_session():
    """Create a database session for scheduler jobs."""
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


def run_retention_archival():
    """Scheduled job to archive expired responses."""
    try:
        db = get_db_session()
        result = RetentionService.archive_expired_responses(db)
        db.close()

        logger.info(
            f"Retention archival job completed: "
            f"forms_processed={result['forms_processed']}, "
            f"responses_archived={result['responses_archived']}"
        )
    except Exception as e:
        logger.error(f"Error in retention archival job: {str(e)}", exc_info=True)


def start_scheduler():
    """Start the background scheduler."""
    if scheduler.running:
        logger.warning("Scheduler is already running")
        return

    try:
        # Schedule retention archival to run daily at 2 AM UTC
        scheduler.add_job(
            run_retention_archival,
            "cron",
            hour=2,
            minute=0,
            id="retention_archival_job",
            replace_existing=True,
            timezone="UTC",
        )
        scheduler.start()
        logger.info("Scheduler started: retention archival scheduled for 02:00 UTC daily")
    except Exception as e:
        logger.error(f"Error starting scheduler: {str(e)}", exc_info=True)


def shutdown_scheduler():
    """Shutdown the background scheduler."""
    if not scheduler.running:
        logger.warning("Scheduler is not running")
        return

    try:
        scheduler.shutdown(wait=True)
        logger.info("Scheduler shutdown complete")
    except Exception as e:
        logger.error(f"Error shutting down scheduler: {str(e)}", exc_info=True)
