from __future__ import annotations

import hashlib
import mimetypes
import re
import uuid
from pathlib import Path


_SAFE_SEGMENT_RE = re.compile(r"[^A-Za-z0-9._-]+")


def sanitize_filename(filename: str) -> str:
    base_name = Path(filename).name.strip() or "file"
    stem = Path(base_name).stem or "file"
    suffix = Path(base_name).suffix.lower()

    safe_stem = _SAFE_SEGMENT_RE.sub("_", stem).strip("._-") or "file"
    safe_stem = safe_stem[:80]

    if suffix:
        safe_suffix = _SAFE_SEGMENT_RE.sub("", suffix)
        if safe_suffix and not safe_suffix.startswith("."):
            safe_suffix = f".{safe_suffix.lstrip('.')}"
    else:
        safe_suffix = ""

    return f"{safe_stem}{safe_suffix}"


def generate_file_key(filename: str) -> str:
    safe_name = sanitize_filename(filename)
    stem = Path(safe_name).stem or "file"
    suffix = Path(safe_name).suffix.lower()
    unique_token = uuid.uuid4().hex[:8]
    return f"file_{unique_token}_{stem}{suffix}"


def extract_extension(filename: str) -> str:
    suffix = Path(sanitize_filename(filename)).suffix.lower()
    return suffix.lstrip(".")


def compute_checksum(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def guess_content_type(filename: str, fallback: str = "application/octet-stream") -> str:
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or fallback
