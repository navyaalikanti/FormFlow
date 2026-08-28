from __future__ import annotations

import hashlib
import json
import re
import secrets
import unicodedata
from datetime import datetime, timezone
from typing import Any


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_text).strip("-").lower()
    return re.sub(r"-{2,}", "-", cleaned)


def generate_public_slug(title: str) -> str:
    base = slugify(title) or "form"
    token = secrets.token_hex(4)
    max_base_length = 160 - len(token) - 1
    trimmed_base = base[:max_base_length].rstrip("-") or "form"
    return f"{trimmed_base}-{token}"


def generate_share_token() -> str:
    return secrets.token_urlsafe(32)


def stable_json_dumps(payload: Any) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)


def build_version_hash(snapshot: dict[str, Any]) -> str:
    return hashlib.sha256(stable_json_dumps(snapshot).encode("utf-8")).hexdigest()
