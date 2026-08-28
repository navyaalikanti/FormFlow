from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.auth import AdminResponse


FormStatus = Literal["draft", "published", "archived"]


class FieldOptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    label: str
    option_value: str
    sort_order: int
    is_default: bool
    option_config: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class FieldOptionCreate(BaseModel):
    label: str = Field(min_length=1, max_length=255)
    option_value: str = Field(min_length=1, max_length=255)
    sort_order: int = 0
    is_default: bool = False
    option_config: dict[str, Any] = Field(default_factory=dict)


class FieldBase(BaseModel):
    label: str = Field(min_length=1, max_length=255)
    field_type: str = Field(min_length=1, max_length=64)
    description: str | None = None
    placeholder: str | None = Field(default=None, max_length=255)
    helper_text: str | None = None
    default_value: dict[str, Any] | list[Any] | str | int | float | bool | None = None
    config: dict[str, Any] = Field(default_factory=dict)
    validation_rules: dict[str, Any] = Field(default_factory=dict)
    ai_config: dict[str, Any] = Field(default_factory=dict)
    is_required: bool = False
    is_hidden: bool = False
    is_read_only: bool = False
    allows_multiple: bool = False
    sort_order: int = 0
    field_key: str | None = Field(default=None, max_length=160)
    section_id: UUID | None = None
    options: list[FieldOptionCreate] = Field(default_factory=list)

    @field_validator("label", "field_type", "field_key", mode="before")
    @classmethod
    def strip_strings(cls, value: Any) -> Any:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or value
        return value


class FieldCreate(FieldBase):
    pass


class FieldUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=255)
    field_type: str | None = Field(default=None, min_length=1, max_length=64)
    description: str | None = None
    placeholder: str | None = Field(default=None, max_length=255)
    helper_text: str | None = None
    default_value: dict[str, Any] | list[Any] | str | int | float | bool | None = None
    config: dict[str, Any] | None = None
    validation_rules: dict[str, Any] | None = None
    ai_config: dict[str, Any] | None = None
    is_required: bool | None = None
    is_hidden: bool | None = None
    is_read_only: bool | None = None
    allows_multiple: bool | None = None
    sort_order: int | None = None
    field_key: str | None = Field(default=None, max_length=160)
    options: list[FieldOptionCreate] | None = None


class FieldResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    form_id: UUID
    section_id: UUID
    field_key: str
    label: str
    field_type: str
    description: str | None
    placeholder: str | None
    helper_text: str | None
    default_value: dict[str, Any] | list[Any] | str | int | float | bool | None
    config: dict[str, Any]
    validation_rules: dict[str, Any]
    ai_config: dict[str, Any]
    is_required: bool
    is_hidden: bool
    is_read_only: bool
    allows_multiple: bool
    sort_order: int
    options: list[FieldOptionResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class SectionBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    section_order: int = 0
    is_collapsible: bool = False
    fields: list[FieldCreate] = Field(default_factory=list)

    @field_validator("title", mode="before")
    @classmethod
    def strip_title(cls, value: Any) -> Any:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or value
        return value


class SectionCreate(SectionBase):
    pass


class SectionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    section_order: int | None = None
    is_collapsible: bool | None = None
    fields: list[FieldCreate] | None = None


class SectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    form_id: UUID
    title: str
    description: str | None
    section_order: int
    is_collapsible: bool
    fields: list[FieldResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class FormSettings(BaseModel):
    model_config = ConfigDict(extra="allow")


class FormBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)
    theme_config: dict[str, Any] = Field(default_factory=dict)
    analytics_config: dict[str, Any] = Field(default_factory=dict)
    ai_config: dict[str, Any] = Field(default_factory=dict)
    sections: list[SectionCreate] = Field(default_factory=list)

    @field_validator("title", mode="before")
    @classmethod
    def strip_title(cls, value: Any) -> Any:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or value
        return value


class FormCreate(FormBase):
    pass


class FormUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    settings: dict[str, Any] | None = None
    theme_config: dict[str, Any] | None = None
    analytics_config: dict[str, Any] | None = None
    ai_config: dict[str, Any] | None = None
    sections: list[SectionUpdate | SectionCreate] | None = None
    conditional_logic_rules: list[dict[str, Any]] | None = None


class FormResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_admin_id: int | None
    title: str
    description: str | None
    status: FormStatus
    public_slug: str
    share_token: str
    published_version_id: UUID | None
    published_version_link_token: str | None = None
    # Removed: draft_of_form_id (no longer exists in the new versioning model)
    settings: dict[str, Any]
    theme_config: dict[str, Any]
    analytics_config: dict[str, Any]
    ai_config: dict[str, Any]
    published_at: datetime | None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime
    owner: AdminResponse | None = None
    sections: list[SectionResponse] = Field(default_factory=list)
    conditional_logic_rules: list[dict[str, Any]] = Field(default_factory=list)
    # Response collection limits
    limit_enabled: bool = False
    max_responses: int | None = None
    deadline_enabled: bool = False
    deadline_datetime: datetime | None = None


class FormListResponse(BaseModel):
    items: list[FormResponse]


class PublishOptionsRequest(BaseModel):
    """Optional response-collection settings sent when publishing a form."""
    limit_enabled: bool = False
    max_responses: int | None = Field(default=None, ge=1)
    deadline_enabled: bool = False
    deadline_datetime: datetime | None = None

    @model_validator(mode="after")
    def check_consistency(self) -> "PublishOptionsRequest":
        if self.limit_enabled and (self.max_responses is None or self.max_responses < 1):
            raise ValueError("max_responses must be a positive integer when limit_enabled is True")
        if self.deadline_enabled and self.deadline_datetime is None:
            raise ValueError("deadline_datetime is required when deadline_enabled is True")
        return self


class PublishValidationError(BaseModel):
    field: str
    message: str


class PublishResponse(BaseModel):
    form: FormResponse
    version_id: UUID
    version_number: int
    message: str = "Form published successfully."


class DuplicateResponse(BaseModel):
    form: FormResponse
    message: str = "Form duplicated successfully."


class MessageResponse(BaseModel):
    message: str


# ─── Version Management Schemas ────────────────────────────────────────────

class FormVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    form_id: UUID
    version_number: int
    version_label: str | None
    # Per-version title and description (authoritative for published versions)
    title: str | None
    description: str | None
    status: str  # "draft" | "published" | "archived"
    change_summary: str | None
    version_hash: str | None
    link_token: str | None  # Public access token for this version
    created_by_admin_id: int | None
    published_by_admin_id: int | None
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
    # Snapshot is NOT included in list responses for brevity


class FormVersionDetailResponse(FormVersionResponse):
    """Version with full snapshot included."""
    snapshot: dict[str, Any]


class FormVersionListResponse(BaseModel):
    items: list[FormVersionResponse]
    total: int
    current_version_id: UUID | None


class RestoreVersionRequest(BaseModel):
    from_version_id: UUID
    version_label: str | None = None
    change_summary: str | None = None


class RestoreVersionResponse(BaseModel):
    form: FormResponse
    new_version_id: UUID
    new_draft_version_number: int
    message: str = "Version restored as new draft."
