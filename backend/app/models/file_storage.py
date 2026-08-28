from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class FileStorage(Base):
    __tablename__ = "file_storage"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_key: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    original_name: Mapped[str] = mapped_column(String(512), nullable=False)
    bucket_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    object_path: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)
    form_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("forms.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    field_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("fields.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    content_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    extension: Mapped[str | None] = mapped_column(String(32), nullable=True)
    size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    checksum: Mapped[str | None] = mapped_column(String(128), nullable=True)
    uploaded_by: Mapped[int | None] = mapped_column(
        ForeignKey("admins.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    uploaded_by_admin = relationship("Admin")
    form = relationship("Form")
    field = relationship("Field")

    __table_args__ = (
        Index("ix_file_storage_bucket_name_uploaded_at", "bucket_name", "uploaded_at"),
        Index("ix_file_storage_form_id_uploaded_at", "form_id", "uploaded_at"),
        Index("ix_file_storage_field_id_uploaded_at", "field_id", "uploaded_at"),
        Index("ix_file_storage_uploaded_by_uploaded_at", "uploaded_by", "uploaded_at"),
        Index("ix_file_storage_is_deleted_deleted_at", "is_deleted", "deleted_at"),
    )
