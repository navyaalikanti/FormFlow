from __future__ import annotations

from typing import Iterable
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.file_storage import FileStorage


class FileStorageRepository:
    @staticmethod
    def create(db: Session, storage_file: FileStorage) -> FileStorage:
        db.add(storage_file)
        db.flush()
        return storage_file

    @staticmethod
    def get_by_file_key(db: Session, file_key: str, include_deleted: bool = False) -> FileStorage | None:
        statement = select(FileStorage).where(FileStorage.file_key == file_key)
        if not include_deleted:
            statement = statement.where(FileStorage.is_deleted.is_(False))
        return db.scalars(statement).first()

    @staticmethod
    def list_by_file_keys(
        db: Session,
        file_keys: Iterable[str],
        include_deleted: bool = False,
    ) -> list[FileStorage]:
        keys = [key for key in file_keys if key]
        if not keys:
            return []

        statement = select(FileStorage).where(FileStorage.file_key.in_(keys))
        if not include_deleted:
            statement = statement.where(FileStorage.is_deleted.is_(False))
        return list(db.scalars(statement).all())

    @staticmethod
    def mark_deleted(db: Session, storage_file: FileStorage) -> FileStorage:
        db.add(storage_file)
        db.flush()
        return storage_file
