"""Retention Policy model for automatic response archival."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Integer, String, func, Boolean
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class RetentionPolicy(Base):
    """Retention policy for automatic archival of old responses."""
    
    __tablename__ = "retention_policies"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=lambda: __import__('uuid').uuid4(),
    )
    form_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("forms.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    retention_days: Mapped[int] = mapped_column(Integer, nullable=False, default=90)
    action: Mapped[str] = mapped_column(String(32), nullable=False, default="archive")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    form = relationship("Form", back_populates="retention_policy")
