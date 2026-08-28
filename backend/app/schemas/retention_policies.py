"""Pydantic schemas for retention policy API requests/responses."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class RetentionPolicyBase(BaseModel):
    """Base retention policy schema."""
    
    enabled: bool = Field(..., description="Enable or disable retention policy")
    retention_days: int = Field(
        ...,
        ge=1,
        le=3650,
        description="Number of days to retain responses (1-3650)",
    )
    action: str = Field(
        default="archive",
        pattern="^archive$",
        description="Action to perform on expired responses",
    )


class RetentionPolicyCreate(RetentionPolicyBase):
    """Schema for creating a retention policy."""
    pass


class RetentionPolicyUpdate(BaseModel):
    """Schema for updating a retention policy."""
    
    enabled: bool | None = None
    retention_days: int | None = Field(None, ge=1, le=3650)
    action: str | None = Field(None, pattern="^archive$")


class RetentionPolicyResponse(RetentionPolicyBase):
    """Schema for retention policy responses."""
    
    id: UUID
    form_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RetentionArchivalResult(BaseModel):
    """Schema for retention job result."""
    
    forms_processed: int
    responses_archived: int
    execution_time_ms: int
