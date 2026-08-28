"""Schemas for validation rules and conditional logic"""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


# Validation Rule Schemas


class TextValidationRules(BaseModel):
    """Validation rules for short_text and paragraph fields"""

    min_length: int | None = Field(default=None, ge=0)
    max_length: int | None = Field(default=None, ge=1)
    pattern: str | None = Field(default=None)
    min_length_message: str | None = None
    max_length_message: str | None = None
    pattern_message: str | None = None


class NumberValidationRules(BaseModel):
    """Validation rules for number fields"""

    min_value: float | None = None
    max_value: float | None = None
    integer_only: bool = False
    decimal_support: bool = True
    positive_only: bool = False
    negative_only: bool = False
    step: float | None = None
    min_value_message: str | None = None
    max_value_message: str | None = None
    integer_message: str | None = None
    positive_message: str | None = None
    negative_message: str | None = None
    step_message: str | None = None


class DateValidationRules(BaseModel):
    """Validation rules for date fields"""

    min_date: str | None = None  # ISO format
    max_date: str | None = None  # ISO format
    disable_past_dates: bool = False
    disable_future_dates: bool = False
    min_date_message: str | None = None
    max_date_message: str | None = None
    past_dates_message: str | None = None
    future_dates_message: str | None = None


class TimeValidationRules(BaseModel):
    """Validation rules for time fields"""

    min_time: str | None = None  # HH:MM format
    max_time: str | None = None  # HH:MM format
    min_time_message: str | None = None
    max_time_message: str | None = None


class FileUploadValidationRules(BaseModel):
    """Validation rules for file upload fields"""

    min_file_size_mb: float | None = None
    max_file_size_mb: float | None = None
    min_file_count: int | None = None
    max_file_count: int | None = None
    allowed_file_types: list[str] = Field(default_factory=list)  # MIME types
    allowed_extensions: list[str] = Field(default_factory=list)  # Extensions without dot
    min_size_message: str | None = None
    max_size_message: str | None = None
    min_count_message: str | None = None
    max_count_message: str | None = None
    file_type_message: str | None = None
    extension_message: str | None = None


class EmailValidationRules(BaseModel):
    """Validation rules for email fields"""

    email_message: str | None = None


class PhoneValidationRules(BaseModel):
    """Validation rules for phone fields"""

    phone_message: str | None = None


class URLValidationRules(BaseModel):
    """Validation rules for URL fields"""

    url_message: str | None = None


class RatingValidationRules(BaseModel):
    """Validation rules for rating fields"""

    max_stars: int = 5
    rating_message: str | None = None


class ValidationError(BaseModel):
    """Single validation error"""

    field_key: str | None = None
    error_type: str
    error_message: str
    attempted_value: Any = None
    validation_rule: dict[str, Any] = Field(default_factory=dict)


class ValidationResult(BaseModel):
    """Result of validating a field"""

    is_valid: bool
    errors: list[ValidationError] = Field(default_factory=list)


class ValidateAnswerRequest(BaseModel):
    """Request to validate field answers"""

    field_id: UUID
    answer_value: Any
    field_type: str
    validation_rules: dict[str, Any] = Field(default_factory=dict)


class BulkValidateRequest(BaseModel):
    """Request to validate multiple field answers"""

    field_validations: list[ValidateAnswerRequest]


# Conditional Logic Schemas


class ConditionalLogicRuleOperator(BaseModel):
    """Represents condition operator and comparison value"""

    operator: Literal[
        "equals",
        "not_equals",
        "contains",
        "not_contains",
        "greater_than",
        "less_than",
        "greater_or_equal",
        "less_or_equal",
        "is_empty",
        "is_not_empty",
        "in",
        "not_in",
        "any_of",
        "all_of",
        "matches_pattern",
    ]
    comparison_value: Any = None


class ConditionalLogicActionConfig(BaseModel):
    """Configuration for a conditional logic action"""

    target_field_key: str
    additional_config: dict[str, Any] = Field(default_factory=dict)


class ConditionalLogicRule(BaseModel):
    """A single conditional logic rule"""

    id: UUID | None = None
    source_field_key: str
    trigger_event: str = "change"  # change, focus, blur
    operator: Literal[
        "equals",
        "not_equals",
        "contains",
        "not_contains",
        "greater_than",
        "less_than",
        "greater_or_equal",
        "less_or_equal",
        "is_empty",
        "is_not_empty",
        "in",
        "not_in",
        "any_of",
        "all_of",
        "matches_pattern",
    ]
    comparison_value: Any = None
    action_type: Literal["show", "hide", "enable", "disable", "require", "optional"]
    action_config: ConditionalLogicActionConfig
    priority: int = 0
    is_active: bool = True


class ConditionalLogicRuleCreate(BaseModel):
    """Create a new conditional logic rule"""

    source_field_key: str
    trigger_event: str = "change"
    operator: Literal[
        "equals",
        "not_equals",
        "contains",
        "not_contains",
        "greater_than",
        "less_than",
        "greater_or_equal",
        "less_or_equal",
        "is_empty",
        "is_not_empty",
        "in",
        "not_in",
        "any_of",
        "all_of",
        "matches_pattern",
    ]
    comparison_value: Any = None
    action_type: Literal["show", "hide", "enable", "disable", "require", "optional"]
    action_config: ConditionalLogicActionConfig
    priority: int = 0
    is_active: bool = True


class ConditionalLogicRuleUpdate(BaseModel):
    """Update an existing conditional logic rule"""

    source_field_key: str | None = None
    trigger_event: str | None = None
    operator: Literal[
        "equals",
        "not_equals",
        "contains",
        "not_contains",
        "greater_than",
        "less_than",
        "greater_or_equal",
        "less_or_equal",
        "is_empty",
        "is_not_empty",
        "in",
        "not_in",
        "any_of",
        "all_of",
        "matches_pattern",
    ] | None = None
    comparison_value: Any = None
    action_type: Literal["show", "hide", "enable", "disable", "require", "optional"] | None = None
    action_config: ConditionalLogicActionConfig | None = None
    priority: int | None = None
    is_active: bool | None = None


class EvaluateConditionalLogicRequest(BaseModel):
    """Request to evaluate conditional logic rules"""

    response_answers: dict[str, Any]


class FieldStateUpdate(BaseModel):
    """Update to field state from conditional logic"""

    field_key: str
    is_hidden: bool | None = None
    is_disabled: bool | None = None
    is_required: bool | None = None


class ConditionalLogicEvaluationResult(BaseModel):
    """Result of evaluating conditional logic"""

    field_states: dict[str, dict[str, Any]]
    field_visibility: dict[str, bool]
    affected_fields: list[str]


class ValidationRuleTemplate(BaseModel):
    """Template for reusable validation rules"""

    id: UUID | None = None
    name: str
    field_type: str
    rules: dict[str, Any]
    created_at: str | None = None
    updated_at: str | None = None


class ValidationRuleTemplateCreate(BaseModel):
    """Create a validation rule template"""

    name: str
    field_type: str
    rules: dict[str, Any]


class ValidationRuleTemplateUpdate(BaseModel):
    """Update a validation rule template"""

    name: str | None = None
    rules: dict[str, Any] | None = None
