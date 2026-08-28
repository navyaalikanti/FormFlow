"""Validation engine for FormFlow fields"""

from __future__ import annotations

import re
from datetime import date, datetime, time
from typing import Any, Literal
from uuid import UUID


class ValidationError(Exception):
    """Base validation error"""

    def __init__(self, error_type: str, message: str, attempted_value: Any = None, rule: dict[str, Any] | None = None):
        self.error_type = error_type
        self.message = message
        self.attempted_value = attempted_value
        self.rule = rule or {}
        super().__init__(message)


class ValidationResult:
    """Result of validating a field value"""

    def __init__(self, is_valid: bool, errors: list[dict[str, Any]] | None = None):
        self.is_valid = is_valid
        self.errors = errors or []

    def to_dict(self) -> dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "errors": self.errors,
        }


class FieldValidator:
    """Base validator for field types"""

    def validate(
        self,
        value: Any,
        rules: dict[str, Any],
        field_type: str,
        field_context: dict[str, Any] | None = None,
    ) -> ValidationResult:
        """Validate a value against rules. Override in subclasses."""
        if value is None or value == "":
            return ValidationResult(True)
        return ValidationResult(True)

    def _add_error(
        self,
        errors: list[dict[str, Any]],
        error_type: str,
        message: str,
        attempted_value: Any,
        rule: dict[str, Any],
    ) -> None:
        """Helper to add error to list"""
        errors.append(
            {
                "error_type": error_type,
                "error_message": message,
                "attempted_value": attempted_value,
                "validation_rule": rule,
            }
        )


class TextFieldValidator(FieldValidator):
    """Validator for short text and paragraph fields"""

    def validate(
        self,
        value: Any,
        rules: dict[str, Any],
        field_type: str,
        field_context: dict[str, Any] | None = None,
    ) -> ValidationResult:
        errors: list[dict[str, Any]] = []

        # Handle None/empty values
        if value is None or value == "":
            return ValidationResult(True)

        # Ensure value is string
        if not isinstance(value, str):
            value = str(value)

        # Min length
        if "min_length" in rules and rules["min_length"] is not None:
            min_len = rules["min_length"]
            if len(value) < min_len:
                custom_msg = rules.get("min_length_message", f"Minimum {min_len} characters required")
                self._add_error(
                    errors,
                    "min_length_violation",
                    custom_msg,
                    value,
                    {"type": "min_length", "value": min_len},
                )

        # Max length
        if "max_length" in rules and rules["max_length"] is not None:
            max_len = rules["max_length"]
            if len(value) > max_len:
                custom_msg = rules.get("max_length_message", f"Maximum {max_len} characters allowed")
                self._add_error(
                    errors,
                    "max_length_violation",
                    custom_msg,
                    value,
                    {"type": "max_length", "value": max_len},
                )

        # Regex pattern
        if "pattern" in rules and rules["pattern"]:
            try:
                if not re.match(rules["pattern"], value):
                    custom_msg = rules.get("pattern_message", "Invalid format")
                    self._add_error(
                        errors,
                        "pattern_violation",
                        custom_msg,
                        value,
                        {"type": "pattern", "value": rules["pattern"]},
                    )
            except re.error:
                pass  # Invalid regex in config, skip

        return ValidationResult(len(errors) == 0, errors)


class NumberFieldValidator(FieldValidator):
    """Validator for number fields"""

    def validate(
        self,
        value: Any,
        rules: dict[str, Any],
        field_type: str,
        field_context: dict[str, Any] | None = None,
    ) -> ValidationResult:
        errors: list[dict[str, Any]] = []

        # Handle None/empty values
        if value is None or value == "":
            return ValidationResult(True)

        # Convert to number
        try:
            if isinstance(value, str):
                num_value = float(value)
            elif isinstance(value, (int, float)) and not isinstance(value, bool):
                num_value = float(value)
            else:
                self._add_error(
                    errors,
                    "invalid_number",
                    "Value must be a number",
                    value,
                    {"type": "invalid_number"},
                )
                return ValidationResult(False, errors)
        except (ValueError, TypeError):
            self._add_error(
                errors,
                "invalid_number",
                "Value must be a valid number",
                value,
                {"type": "invalid_number"},
            )
            return ValidationResult(False, errors)

        # Integer only
        if rules.get("integer_only", False):
            if num_value != int(num_value):
                custom_msg = rules.get("integer_message", "Value must be a whole number")
                self._add_error(
                    errors,
                    "not_integer",
                    custom_msg,
                    value,
                    {"type": "integer_only"},
                )

        # Positive only
        if rules.get("positive_only", False):
            if num_value <= 0:
                custom_msg = rules.get("positive_message", "Value must be positive")
                self._add_error(
                    errors,
                    "not_positive",
                    custom_msg,
                    value,
                    {"type": "positive_only"},
                )

        # Negative only
        if rules.get("negative_only", False):
            if num_value >= 0:
                custom_msg = rules.get("negative_message", "Value must be negative")
                self._add_error(
                    errors,
                    "not_negative",
                    custom_msg,
                    value,
                    {"type": "negative_only"},
                )

        # Min value
        if "min_value" in rules and rules["min_value"] is not None:
            min_val = rules["min_value"]
            if num_value < min_val:
                custom_msg = rules.get("min_value_message", f"Minimum value is {min_val}")
                self._add_error(
                    errors,
                    "below_minimum",
                    custom_msg,
                    value,
                    {"type": "min_value", "value": min_val},
                )

        # Max value
        if "max_value" in rules and rules["max_value"] is not None:
            max_val = rules["max_value"]
            if num_value > max_val:
                custom_msg = rules.get("max_value_message", f"Maximum value is {max_val}")
                self._add_error(
                    errors,
                    "above_maximum",
                    custom_msg,
                    value,
                    {"type": "max_value", "value": max_val},
                )

        # Step value
        if "step" in rules and rules["step"] is not None:
            step = rules["step"]
            if step > 0:
                remainder = num_value % step
                if remainder != 0:
                    custom_msg = rules.get("step_message", f"Value must be a multiple of {step}")
                    self._add_error(
                        errors,
                        "invalid_step",
                        custom_msg,
                        value,
                        {"type": "step", "value": step},
                    )

        return ValidationResult(len(errors) == 0, errors)


class DateFieldValidator(FieldValidator):
    """Validator for date fields"""

    def validate(
        self,
        value: Any,
        rules: dict[str, Any],
        field_type: str,
        field_context: dict[str, Any] | None = None,
    ) -> ValidationResult:
        errors: list[dict[str, Any]] = []

        # Handle None/empty values
        if value is None or value == "":
            return ValidationResult(True)

        # Parse date
        try:
            if isinstance(value, str):
                date_value = date.fromisoformat(value)
            elif isinstance(value, datetime):
                date_value = value.date()
            elif isinstance(value, date):
                date_value = value
            else:
                self._add_error(
                    errors,
                    "invalid_date",
                    "Value must be a valid date",
                    value,
                    {"type": "invalid_date"},
                )
                return ValidationResult(False, errors)
        except (ValueError, AttributeError):
            self._add_error(
                errors,
                "invalid_date",
                "Value must be a valid date",
                value,
                {"type": "invalid_date"},
            )
            return ValidationResult(False, errors)

        today = datetime.now().date()

        # Min date
        if "min_date" in rules and rules["min_date"]:
            try:
                min_date = date.fromisoformat(rules["min_date"])
                if date_value < min_date:
                    custom_msg = rules.get("min_date_message", f"Date must be on or after {min_date}")
                    self._add_error(
                        errors,
                        "before_minimum_date",
                        custom_msg,
                        value,
                        {"type": "min_date", "value": rules["min_date"]},
                    )
            except ValueError:
                pass

        # Max date
        if "max_date" in rules and rules["max_date"]:
            try:
                max_date = date.fromisoformat(rules["max_date"])
                if date_value > max_date:
                    custom_msg = rules.get("max_date_message", f"Date must be on or before {max_date}")
                    self._add_error(
                        errors,
                        "after_maximum_date",
                        custom_msg,
                        value,
                        {"type": "max_date", "value": rules["max_date"]},
                    )
            except ValueError:
                pass

        # Disable past dates
        if rules.get("disable_past_dates", False):
            if date_value < today:
                custom_msg = rules.get("past_dates_message", "Past dates are not allowed")
                self._add_error(
                    errors,
                    "past_date_not_allowed",
                    custom_msg,
                    value,
                    {"type": "disable_past_dates"},
                )

        # Disable future dates
        if rules.get("disable_future_dates", False):
            if date_value > today:
                custom_msg = rules.get("future_dates_message", "Future dates are not allowed")
                self._add_error(
                    errors,
                    "future_date_not_allowed",
                    custom_msg,
                    value,
                    {"type": "disable_future_dates"},
                )

        return ValidationResult(len(errors) == 0, errors)


class TimeFieldValidator(FieldValidator):
    """Validator for time fields"""

    def validate(
        self,
        value: Any,
        rules: dict[str, Any],
        field_type: str,
        field_context: dict[str, Any] | None = None,
    ) -> ValidationResult:
        errors: list[dict[str, Any]] = []

        # Handle None/empty values
        if value is None or value == "":
            return ValidationResult(True)

        # Parse time
        try:
            if isinstance(value, str):
                time_value = time.fromisoformat(value)
            elif isinstance(value, datetime):
                time_value = value.time()
            elif isinstance(value, time):
                time_value = value
            else:
                self._add_error(
                    errors,
                    "invalid_time",
                    "Value must be a valid time",
                    value,
                    {"type": "invalid_time"},
                )
                return ValidationResult(False, errors)
        except (ValueError, AttributeError):
            self._add_error(
                errors,
                "invalid_time",
                "Value must be a valid time in HH:MM or HH:MM:SS format",
                value,
                {"type": "invalid_time"},
            )
            return ValidationResult(False, errors)

        # Min time
        if "min_time" in rules and rules["min_time"]:
            try:
                min_time = time.fromisoformat(rules["min_time"])
                if time_value < min_time:
                    custom_msg = rules.get("min_time_message", f"Time must be on or after {min_time}")
                    self._add_error(
                        errors,
                        "before_minimum_time",
                        custom_msg,
                        value,
                        {"type": "min_time", "value": rules["min_time"]},
                    )
            except ValueError:
                pass

        # Max time
        if "max_time" in rules and rules["max_time"]:
            try:
                max_time = time.fromisoformat(rules["max_time"])
                if time_value > max_time:
                    custom_msg = rules.get("max_time_message", f"Time must be on or before {max_time}")
                    self._add_error(
                        errors,
                        "after_maximum_time",
                        custom_msg,
                        value,
                        {"type": "max_time", "value": rules["max_time"]},
                    )
            except ValueError:
                pass

        return ValidationResult(len(errors) == 0, errors)


class FileUploadValidator(FieldValidator):
    """Validator for file upload fields"""

    @staticmethod
    def _normalize_filename(value: Any) -> str:
        if isinstance(value, dict):
            filename = value.get("filename") or value.get("original_name") or value.get("name") or ""
        else:
            filename = str(value or "")
        return filename.strip().lower()

    def validate(
        self,
        value: Any,
        rules: dict[str, Any],
        field_type: str,
        field_context: dict[str, Any] | None = None,
    ) -> ValidationResult:
        errors: list[dict[str, Any]] = []

        # Handle None/empty values
        if value is None or value == "":
            return ValidationResult(True)

        # If value is a dict with file info, validate it
        if isinstance(value, dict):
            file_size = value.get("file_size_bytes", 0) or 0
            mime_type = value.get("mime_type", "")
            filename = value.get("filename") or value.get("original_name") or value.get("name") or ""

            if file_size <= 0:
                self._add_error(
                    errors,
                    "empty_file",
                    "Empty files are not allowed",
                    value,
                    {"type": "empty_file"},
                )

            # Check file size
            if "min_file_size_mb" in rules and rules["min_file_size_mb"] is not None:
                min_size_bytes = rules["min_file_size_mb"] * 1024 * 1024
                if file_size < min_size_bytes:
                    custom_msg = rules.get(
                        "min_size_message",
                        f"File size must be at least {rules['min_file_size_mb']}MB",
                    )
                    self._add_error(
                        errors,
                        "file_too_small",
                        custom_msg,
                        value,
                        {"type": "min_file_size", "value": rules["min_file_size_mb"]},
                    )

            if "max_file_size_mb" in rules and rules["max_file_size_mb"] is not None:
                max_size_bytes = rules["max_file_size_mb"] * 1024 * 1024
                if file_size > max_size_bytes:
                    custom_msg = rules.get(
                        "max_size_message",
                        f"File size must not exceed {rules['max_file_size_mb']}MB",
                    )
                    self._add_error(
                        errors,
                        "file_too_large",
                        custom_msg,
                        value,
                        {"type": "max_file_size", "value": rules["max_file_size_mb"]},
                    )

            # Check allowed file types
            if "allowed_file_types" in rules and rules["allowed_file_types"]:
                allowed_types = rules["allowed_file_types"]
                if mime_type and not any(
                    mime_type.startswith(t) if t.endswith("/*") else mime_type == t
                    for t in allowed_types
                ):
                    custom_msg = rules.get(
                        "file_type_message",
                        f"Only files of type {', '.join(allowed_types)} are allowed",
                    )
                    self._add_error(
                        errors,
                        "invalid_file_type",
                        custom_msg,
                        value,
                        {"type": "allowed_file_types", "value": allowed_types},
                    )

            # Check allowed extensions
            if "allowed_extensions" in rules and rules["allowed_extensions"]:
                allowed_exts = rules["allowed_extensions"]
                file_ext = filename.split(".")[-1].lower() if "." in filename else ""
                if file_ext and file_ext not in [ext.lower() for ext in allowed_exts]:
                    custom_msg = rules.get(
                        "extension_message",
                        f"Only {', '.join(allowed_exts)} files are allowed",
                    )
                    self._add_error(
                        errors,
                        "invalid_extension",
                        custom_msg,
                        value,
                        {"type": "allowed_extensions", "value": allowed_exts},
                    )
        elif isinstance(value, list):
            if "min_file_count" in rules and rules["min_file_count"] is not None:
                if len(value) < rules["min_file_count"]:
                    custom_msg = rules.get(
                        "min_count_message",
                        f"Minimum {rules['min_file_count']} files required",
                    )
                    self._add_error(
                        errors,
                        "too_few_files",
                        custom_msg,
                        value,
                        {"type": "min_file_count", "value": rules["min_file_count"]},
                    )

            # Multiple files
            if "max_file_count" in rules and rules["max_file_count"] is not None:
                if len(value) > rules["max_file_count"]:
                    custom_msg = rules.get(
                        "max_count_message",
                        f"Maximum {rules['max_file_count']} files allowed",
                    )
                    self._add_error(
                        errors,
                        "too_many_files",
                        custom_msg,
                        value,
                        {"type": "max_file_count", "value": rules["max_file_count"]},
                    )

            seen_filenames: set[str] = set()
            # Validate each file
            for file_item in value:
                if isinstance(file_item, dict):
                    normalized_name = self._normalize_filename(file_item)
                    if normalized_name and normalized_name in seen_filenames:
                        self._add_error(
                            errors,
                            "duplicate_filename",
                            "Duplicate filenames are not allowed in the same upload request",
                            value,
                            {"type": "duplicate_filename"},
                        )
                    if normalized_name:
                        seen_filenames.add(normalized_name)
                    result = self.validate(file_item, rules, field_type)
                    errors.extend(result.errors)
                else:
                    self._add_error(
                        errors,
                        "invalid_file_item",
                        "Each file entry must include file metadata",
                        file_item,
                        {"type": "invalid_file_item"},
                    )

        return ValidationResult(len(errors) == 0, errors)


class EmailFieldValidator(FieldValidator):
    """Validator for email fields"""

    EMAIL_PATTERN = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"

    def validate(
        self,
        value: Any,
        rules: dict[str, Any],
        field_type: str,
        field_context: dict[str, Any] | None = None,
    ) -> ValidationResult:
        errors: list[dict[str, Any]] = []

        # Handle None/empty values
        if value is None or value == "":
            return ValidationResult(True)

        # Validate email format
        if not isinstance(value, str):
            value = str(value)

        if not re.match(self.EMAIL_PATTERN, value):
            custom_msg = rules.get("email_message", "Invalid email address")
            self._add_error(
                errors,
                "invalid_email",
                custom_msg,
                value,
                {"type": "email_format"},
            )

        return ValidationResult(len(errors) == 0, errors)


class PhoneFieldValidator(FieldValidator):
    """Validator for phone fields"""

    def validate(
        self,
        value: Any,
        rules: dict[str, Any],
        field_type: str,
        field_context: dict[str, Any] | None = None,
    ) -> ValidationResult:
        errors: list[dict[str, Any]] = []

        # Handle None/empty values
        if value is None or value == "":
            return ValidationResult(True)

        # Validate phone format (basic)
        if not isinstance(value, str):
            value = str(value)

        # Remove common formatting characters
        cleaned = re.sub(r"[\s\-\(\)\+\.]", "", value)

        if not cleaned.isdigit() or len(cleaned) < 7:
            custom_msg = rules.get("phone_message", "Invalid phone number")
            self._add_error(
                errors,
                "invalid_phone",
                custom_msg,
                value,
                {"type": "phone_format"},
            )

        return ValidationResult(len(errors) == 0, errors)


class URLFieldValidator(FieldValidator):
    """Validator for URL fields"""

    URL_PATTERN = r"^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$"

    def validate(
        self,
        value: Any,
        rules: dict[str, Any],
        field_type: str,
        field_context: dict[str, Any] | None = None,
    ) -> ValidationResult:
        errors: list[dict[str, Any]] = []

        # Handle None/empty values
        if value is None or value == "":
            return ValidationResult(True)

        if not isinstance(value, str):
            value = str(value)

        if not re.match(self.URL_PATTERN, value):
            custom_msg = rules.get("url_message", "Invalid URL")
            self._add_error(
                errors,
                "invalid_url",
                custom_msg,
                value,
                {"type": "url_format"},
            )

        return ValidationResult(len(errors) == 0, errors)


class RatingFieldValidator(FieldValidator):
    """Validator for rating fields"""

    def validate(
        self,
        value: Any,
        rules: dict[str, Any],
        field_type: str,
        field_context: dict[str, Any] | None = None,
    ) -> ValidationResult:
        errors: list[dict[str, Any]] = []

        # Handle None/empty values
        if value is None or value == "":
            return ValidationResult(True)

        # Ensure value is integer
        try:
            rating = int(value)
        except (ValueError, TypeError):
            self._add_error(
                errors,
                "invalid_rating",
                "Rating must be a number",
                value,
                {"type": "invalid_rating"},
            )
            return ValidationResult(False, errors)

        max_stars = rules.get("max_stars", 5)

        if rating < 1 or rating > max_stars:
            custom_msg = rules.get("rating_message", f"Rating must be between 1 and {max_stars}")
            self._add_error(
                errors,
                "invalid_rating_range",
                custom_msg,
                value,
                {"type": "rating_range", "value": max_stars},
            )

        return ValidationResult(len(errors) == 0, errors)


class ChoiceFieldValidator(FieldValidator):
    """Validator for dropdown, radio, and checkbox fields"""

    def _allowed_values(self, field_context: dict[str, Any] | None) -> list[str]:
        options = (field_context or {}).get("options", [])
        allowed_values: list[str] = []

        for option in options:
            if isinstance(option, dict):
                option_value = option.get("option_value", option.get("value"))
            else:
                option_value = option

            if option_value is not None:
                allowed_values.append(str(option_value))

        return allowed_values

    def validate(
        self,
        value: Any,
        rules: dict[str, Any],
        field_type: str,
        field_context: dict[str, Any] | None = None,
    ) -> ValidationResult:
        errors: list[dict[str, Any]] = []

        if value is None or value == "":
            return ValidationResult(True)

        allowed_values = self._allowed_values(field_context)
        if not allowed_values:
            return ValidationResult(True)

        if field_type == "checkbox":
            if isinstance(value, str):
                selected_values = [value]
            elif isinstance(value, (list, tuple, set)):
                selected_values = list(value)
            else:
                self._add_error(
                    errors,
                    "invalid_choice",
                    "Selected values are invalid",
                    value,
                    {"type": "allowed_options", "value": allowed_values},
                )
                return ValidationResult(False, errors)

            invalid_values = [str(selected) for selected in selected_values if str(selected) not in allowed_values]
            if invalid_values:
                custom_msg = rules.get("choice_message", "One or more selected options are invalid")
                self._add_error(
                    errors,
                    "invalid_choice",
                    custom_msg,
                    value,
                    {"type": "allowed_options", "value": allowed_values},
                )
        else:
            selected_value = str(value)
            if selected_value not in allowed_values:
                custom_msg = rules.get("choice_message", "Selected option is invalid")
                self._add_error(
                    errors,
                    "invalid_choice",
                    custom_msg,
                    value,
                    {"type": "allowed_options", "value": allowed_values},
                )

        return ValidationResult(len(errors) == 0, errors)


class ValidationService:
    """Main validation service that routes to appropriate validators"""

    VALIDATORS: dict[str, type[FieldValidator]] = {
        "short_text": TextFieldValidator,
        "paragraph": TextFieldValidator,
        "number": NumberFieldValidator,
        "date": DateFieldValidator,
        "time": TimeFieldValidator,
        "file": FileUploadValidator,
        "email": EmailFieldValidator,
        "phone": PhoneFieldValidator,
        "url": URLFieldValidator,
        "rating": RatingFieldValidator,
        "dropdown": ChoiceFieldValidator,
        "radio": ChoiceFieldValidator,
        "checkbox": ChoiceFieldValidator,
    }

    @classmethod
    def validate_field(
        cls,
        value: Any,
        field_type: str,
        rules: dict[str, Any],
        field_context: dict[str, Any] | None = None,
    ) -> ValidationResult:
        """Validate a field value against its rules"""
        validator_class = cls.VALIDATORS.get(field_type, FieldValidator)
        validator = validator_class()
        return validator.validate(value, rules, field_type, field_context)

    @classmethod
    def validate_response_answers(
        cls,
        answers: dict[str, Any],
        fields: dict[str, dict[str, Any]],
    ) -> dict[str, ValidationResult]:
        """Validate multiple answers from a form response"""
        results: dict[str, ValidationResult] = {}
        for field_key, value in answers.items():
            if field_key in fields:
                field = fields[field_key]
                results[field_key] = cls.validate_field(
                    value,
                    field.get("field_type", "short_text"),
                    field.get("validation_rules", {}),
                    field,
                )
        return results
