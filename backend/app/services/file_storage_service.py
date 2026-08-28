from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any
from uuid import UUID
from urllib.parse import unquote, urlparse

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.models.file_storage import FileStorage
from app.repositories.file_storage_repository import FileStorageRepository
from app.schemas.files import FileStorageDownloadResponse, FileStorageResponse, FileUploadItemResponse
from app.schemas.validation import FileUploadValidationRules
from app.services.supabase_storage_service import SupabaseStorageError, SupabaseStorageService
from app.services.validation_service import ValidationService
from app.utils.files import compute_checksum, extract_extension, generate_file_key, guess_content_type, sanitize_filename
from app.utils.forms import utcnow

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class UploadedFilePayload:
    original_name: str
    file_key: str
    object_path: str
    content_type: str
    extension: str
    size: int
    checksum: str
    content: bytes


class FileStorageServiceError(RuntimeError):
    pass


class FileStorageService:
    @staticmethod
    def _supabase_client() -> SupabaseStorageService:
        return SupabaseStorageService()

    @staticmethod
    def _normalize_rules(rules: dict[str, Any] | None) -> FileUploadValidationRules:
        return FileUploadValidationRules.model_validate(rules or {})

    @staticmethod
    def _normalize_object_path(raw_object_path: str | None, bucket_name: str | None = None) -> str:
        if not raw_object_path:
            return ""

        normalized = raw_object_path.strip().replace("\\", "/")
        if not normalized:
            return ""

        if normalized.startswith(("http://", "https://")):
            normalized = urlparse(normalized).path or normalized

        normalized = unquote(normalized).split("?", 1)[0].split("#", 1)[0].lstrip("/")

        bucket = (bucket_name or settings.supabase_bucket or "").strip("/")
        prefixes = []
        if bucket:
            prefixes.extend(
                [
                    f"storage/v1/object/public/{bucket}/",
                    f"storage/v1/object/sign/{bucket}/",
                    f"storage/v1/object/{bucket}/",
                    f"{bucket}/",
                ]
            )

        changed = True
        while changed and normalized:
            changed = False
            for prefix in prefixes:
                if normalized.startswith(prefix):
                    normalized = normalized[len(prefix):].lstrip("/")
                    changed = True
                    break

        return normalized or raw_object_path.strip()

    @staticmethod
    def _resolve_object_path(storage_file: FileStorage) -> str:
        normalized_object_path = FileStorageService._normalize_object_path(storage_file.object_path, storage_file.bucket_name)
        if normalized_object_path:
            return normalized_object_path

        normalized_file_key = FileStorageService._normalize_object_path(storage_file.file_key, storage_file.bucket_name)
        if normalized_file_key:
            return normalized_file_key

        return storage_file.file_key

    @staticmethod
    def _build_payload(upload_file: UploadFile) -> UploadedFilePayload:
        original_name = sanitize_filename(upload_file.filename or "file")
        content = upload_file.file.read()
        if not isinstance(content, bytes):
            content = bytes(content)
        size = len(content)
        content_type = upload_file.content_type or guess_content_type(original_name)
        extension = extract_extension(original_name)
        checksum = compute_checksum(content)
        file_key = generate_file_key(original_name)
        return UploadedFilePayload(
            original_name=original_name,
            file_key=file_key,
            object_path=file_key,
            content_type=content_type,
            extension=extension,
            size=size,
            checksum=checksum,
            content=content,
        )

    @staticmethod
    def _validation_context(payloads: list[UploadedFilePayload]) -> dict[str, Any]:
        return {
            "allowed_file_types": [],
            "allowed_extensions": [],
            "min_file_size_mb": None,
            "max_file_size_mb": None,
            "min_file_count": None,
            "max_file_count": None,
        }

    @staticmethod
    def validate_upload_payloads(
        payloads: list[UploadedFilePayload],
        validation_rules: dict[str, Any] | None,
    ) -> None:
        rules = FileUploadValidationRules.model_validate(validation_rules or {}).model_dump()
        file_values = [
            {
                "filename": payload.original_name,
                "original_name": payload.original_name,
                "file_size_bytes": payload.size,
                "mime_type": payload.content_type,
            }
            for payload in payloads
        ]
        result = ValidationService.validate_field(file_values, "file", rules, {"files": file_values})
        if not result.is_valid:
            messages = [str(error.get("error_message", "Invalid file upload")) for error in result.errors]
            raise FileStorageServiceError("; ".join(messages))

    @staticmethod
    def upload_files(
        db: Session,
        upload_files: list[UploadFile],
        uploaded_by_admin_id: int | None,
        form_id: UUID | None = None,
        field_id: UUID | None = None,
        validation_rules: dict[str, Any] | None = None,
    ) -> list[FileStorage]:
        if not upload_files:
            raise FileStorageServiceError("At least one file is required.")

        payloads = [FileStorageService._build_payload(upload_file) for upload_file in upload_files]
        FileStorageService.validate_upload_payloads(payloads, validation_rules)

        supabase = FileStorageService._supabase_client()
        created_files: list[FileStorage] = []
        uploaded_object_paths: list[str] = []

        try:
            for payload in payloads:
                upload_result = supabase.upload_object(
                    payload.object_path,
                    payload.content,
                    payload.content_type,
                )
                logger.debug(
                    "Persisting uploaded file metadata bucket=%s file_key=%s object_path=%s upload_result=%s",
                    settings.supabase_bucket,
                    payload.file_key,
                    payload.object_path,
                    upload_result,
                )
                uploaded_object_paths.append(payload.object_path)
                storage_file = FileStorage(
                    file_key=payload.file_key,
                    original_name=payload.original_name,
                    bucket_name=settings.supabase_bucket,
                    object_path=payload.object_path,
                    form_id=form_id,
                    field_id=field_id,
                    content_type=payload.content_type,
                    extension=payload.extension,
                    size=payload.size,
                    checksum=payload.checksum,
                    uploaded_by=uploaded_by_admin_id,
                    uploaded_at=utcnow(),
                    is_deleted=False,
                )
                FileStorageRepository.create(db, storage_file)
                created_files.append(storage_file)

            db.commit()
            for storage_file in created_files:
                db.refresh(storage_file)
            return created_files
        except Exception:
            db.rollback()
            for object_path in reversed(uploaded_object_paths):
                try:
                    supabase.delete_object(object_path)
                except Exception:
                    pass
            raise
        finally:
            for upload_file in upload_files:
                try:
                    upload_file.file.close()
                except Exception:
                    pass

    @staticmethod
    def get_file_or_404(db: Session, file_key: str) -> FileStorage:
        storage_file = FileStorageRepository.get_by_file_key(db, file_key)
        if storage_file is None:
            raise LookupError("File not found")
        logger.debug(
            "Loaded file metadata from database file_key=%s bucket=%s object_path=%s",
            storage_file.file_key,
            storage_file.bucket_name,
            storage_file.object_path,
        )
        return storage_file

    @staticmethod
    def generate_signed_url(
        storage_file: FileStorage,
        expires_in_seconds: int = 600,
        download: bool = True,
    ) -> str:
        if storage_file.is_deleted:
            raise FileStorageServiceError("File has been deleted.")
        supabase = FileStorageService._supabase_client()
        object_path = FileStorageService._resolve_object_path(storage_file)
        logger.debug(
            "Signing download url bucket=%s file_key=%s stored_object_path=%s resolved_object_path=%s expires_in_seconds=%s download=%s",
            storage_file.bucket_name,
            storage_file.file_key,
            storage_file.object_path,
            object_path,
            expires_in_seconds,
            download,
        )
        return supabase.create_signed_url(object_path, expires_in_seconds=expires_in_seconds, download=download)

    @staticmethod
    def create_signed_download_url(
        storage_file: FileStorage,
        expires_in_seconds: int = 600,
    ) -> str:
        return FileStorageService.generate_signed_url(storage_file, expires_in_seconds, download=True)

    @staticmethod
    def build_file_upload_item_response(
        storage_file: FileStorage,
        expires_in_seconds: int = 600,
    ) -> FileUploadItemResponse:
        signed_download_url = None
        try:
            signed_download_url = FileStorageService.generate_signed_url(storage_file, expires_in_seconds, download=True)
        except Exception:
            signed_download_url = None
        return FileUploadItemResponse.model_validate(storage_file).model_copy(
            update={"signed_download_url": signed_download_url}
        )

    @staticmethod
    def build_file_download_response(
        storage_file: FileStorage,
        expires_in_seconds: int = 600,
        download: bool = True,
    ) -> FileStorageDownloadResponse:
        signed_download_url = FileStorageService.generate_signed_url(storage_file, expires_in_seconds, download=download)
        base_data = FileStorageResponse.model_validate(storage_file).model_dump()
        return FileStorageDownloadResponse(
            **base_data,
            signed_download_url=signed_download_url,
            expires_in_seconds=expires_in_seconds,
        )

    @staticmethod
    def delete_file(db: Session, storage_file: FileStorage) -> FileStorage:
        if storage_file.is_deleted:
            return storage_file

        supabase = FileStorageService._supabase_client()
        object_path = FileStorageService._resolve_object_path(storage_file)
        try:
            supabase.delete_object(object_path)
        except SupabaseStorageError:
            # If the object is already gone, we still soft-delete the metadata.
            pass

        storage_file.is_deleted = True
        storage_file.deleted_at = utcnow()
        FileStorageRepository.mark_deleted(db, storage_file)
        db.commit()
        db.refresh(storage_file)
        return storage_file
