from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings
from app.routers.auth import router as auth_router
from app.routers.files import router as files_router
from app.routers.files import public_router as public_files_router
from app.routers.fields import router as fields_router
from app.routers.forms import router as forms_router, public_router as public_forms_router
from app.routers.validation import router as validation_router
from app.routers.responses import router as responses_router
from app.routers.dashboard import router as dashboard_router
from app.routers.audit_logs import router as audit_logs_router
from app.routers.retention_policies import router as retention_policies_router
from app.scheduler import start_scheduler, shutdown_scheduler

app = FastAPI(
    title="FormFlow API",
    version="1.0.0",
    description="Backend API for FormFlow",
)


@app.on_event("startup")
async def startup_event():
    """Initialize scheduler on application startup."""
    start_scheduler()


@app.on_event("shutdown")
def shutdown_event():
    """Shutdown scheduler on application shutdown."""
    shutdown_scheduler()

origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(forms_router, prefix="/api")
app.include_router(public_forms_router, prefix="/api")
app.include_router(files_router, prefix="/api")
app.include_router(public_files_router, prefix="/api")
app.include_router(fields_router, prefix="/api")
app.include_router(validation_router, prefix="/api")
app.include_router(responses_router)
app.include_router(dashboard_router)
app.include_router(audit_logs_router)
app.include_router(retention_policies_router, prefix="/api")


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
