from __future__ import annotations

import logging
import os
from typing import Any

from supabase import create_client, Client
from app.config.settings import settings

logger = logging.getLogger(__name__)


class SupabaseStorageError(RuntimeError):
    pass


class SupabaseStorageService:
    def __init__(
        self,
        supabase_url: str | None = None,
        supabase_secret_key: str | None = None,
        bucket_name: str | None = None,
    ) -> None:
        self.supabase_url = (supabase_url or settings.supabase_url).rstrip("/")
        # Verify SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY
        self.supabase_secret_key = (
            supabase_secret_key or
            settings.supabase_service_role_key or
            settings.supabase_secret_key or
            os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or
            os.environ.get("SUPABASE_SECRET_KEY")
        )
        self.bucket_name = bucket_name or settings.supabase_bucket

        if not self.supabase_url:
            raise SupabaseStorageError("SUPABASE_URL is not configured.")
        if not self.supabase_secret_key:
            raise SupabaseStorageError("SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY is not configured.")
        if not self.bucket_name:
            raise SupabaseStorageError("SUPABASE_BUCKET is not configured.")

        try:
            logger.info("Initializing Supabase Client with URL=%s", self.supabase_url)
            self.client: Client = create_client(self.supabase_url, self.supabase_secret_key)
            logger.info("Supabase Client initialized successfully via SDK.")
        except Exception as exc:
            logger.error("Failed to initialize Supabase client: %s", exc)
            raise SupabaseStorageError(f"Failed to initialize Supabase client: {exc}") from exc

    def upload_object(
        self,
        object_path: str,
        content: bytes,
        content_type: str,
        upsert: bool = False,
    ) -> dict[str, Any]:
        # Task 2: Log details of upload
        logger.info(
            "Uploading object via SDK: Bucket=%s, Object Path=%s, Content Type=%s, Upsert=%s",
            self.bucket_name,
            object_path,
            content_type,
            upsert,
        )
        try:
            # Upload using official SDK
            res = self.client.storage.from_(self.bucket_name).upload(
                path=object_path,
                file=content,
                file_options={
                    "content-type": content_type,
                    "upsert": "true" if upsert else "false"
                }
            )
            logger.info("Supabase SDK upload success: path=%s, full_path=%s", res.path, res.full_path)
            return {"path": res.path, "full_path": res.full_path, "status": "uploaded"}
        except Exception as exc:
            logger.error("Supabase SDK upload failed: %s", exc)
            raise SupabaseStorageError(str(exc)) from exc

    def delete_object(self, object_path: str) -> None:
        logger.info("Deleting object via SDK: Bucket=%s, Object Path=%s", self.bucket_name, object_path)
        try:
            res = self.client.storage.from_(self.bucket_name).remove([object_path])
            logger.info("Supabase SDK delete response: %s", res)
        except Exception as exc:
            logger.error("Supabase SDK delete failed: %s", exc)
            raise SupabaseStorageError(str(exc)) from exc

    def create_signed_url(
        self,
        object_path: str,
        expires_in_seconds: int = 600,
        download: bool = True,
    ) -> str:
        # Task 4: Before calling create_signed_url(), print: Bucket, Object Path, Expiration
        logger.info(
            "Generating signed URL: Bucket=%s, Object Path=%s, Expiration=%d seconds, Download=%s",
            self.bucket_name,
            object_path,
            expires_in_seconds,
            download,
        )
        try:
            # Call official SDK
            res = self.client.storage.from_(self.bucket_name).create_signed_url(
                path=object_path,
                expires_in=expires_in_seconds,
                options={"download": download}
            )
            # Task 4: After calling, print the COMPLETE response returned by Supabase
            logger.info("Supabase SDK create_signed_url response: %s", res)
            
            signed_url = res.get("signedURL") or res.get("signedUrl") or ""
            if not signed_url:
                raise SupabaseStorageError("Supabase did not return a signed URL.")
            return signed_url
        except Exception as exc:
            logger.error("Supabase SDK create_signed_url failed: %s", exc)
            raise SupabaseStorageError(str(exc)) from exc
