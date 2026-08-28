"""Tests for validation service"""

import pytest
from app.services.validation_service import (
    ValidationService,
    TextFieldValidator,
    NumberFieldValidator,
    DateFieldValidator,
    TimeFieldValidator,
    EmailFieldValidator,
    PhoneFieldValidator,
    URLFieldValidator,
    RatingFieldValidator,
    ChoiceFieldValidator,
    ValidationResult,
)


class TestTextFieldValidator:
    """Test text field validation"""

    def test_empty_value_is_valid(self):
        validator = TextFieldValidator()
        result = validator.validate("", {}, "short_text")
        assert result.is_valid

    def test_min_length_validation(self):
        validator = TextFieldValidator()
        result = validator.validate("ab", {"min_length": 3}, "short_text")
        assert not result.is_valid
        assert len(result.errors) == 1
        assert result.errors[0]["error_type"] == "min_length_violation"

    def test_max_length_validation(self):
        validator = TextFieldValidator()
        result = validator.validate("abcde", {"max_length": 3}, "short_text")
        assert not result.is_valid
        assert len(result.errors) == 1
        assert result.errors[0]["error_type"] == "max_length_violation"

    def test_pattern_validation(self):
        validator = TextFieldValidator()
        result = validator.validate("abc123", {"pattern": r"^[a-z]+$"}, "short_text")
        assert not result.is_valid
        assert result.errors[0]["error_type"] == "pattern_violation"

    def test_pattern_validation_success(self):
        validator = TextFieldValidator()
        result = validator.validate("abc", {"pattern": r"^[a-z]+$"}, "short_text")
        assert result.is_valid


class TestNumberFieldValidator:
    """Test number field validation"""

    def test_valid_number(self):
        validator = NumberFieldValidator()
        result = validator.validate(42, {}, "number")
        assert result.is_valid

    def test_invalid_number(self):
        validator = NumberFieldValidator()
        result = validator.validate("not a number", {}, "number")
        assert not result.is_valid

    def test_min_value_validation(self):
        validator = NumberFieldValidator()
        result = validator.validate(5, {"min_value": 10}, "number")
        assert not result.is_valid
        assert result.errors[0]["error_type"] == "below_minimum"

    def test_max_value_validation(self):
        validator = NumberFieldValidator()
        result = validator.validate(15, {"max_value": 10}, "number")
        assert not result.is_valid
        assert result.errors[0]["error_type"] == "above_maximum"

    def test_integer_only_validation(self):
        validator = NumberFieldValidator()
        result = validator.validate(3.14, {"integer_only": True}, "number")
        assert not result.is_valid
        assert result.errors[0]["error_type"] == "not_integer"

    def test_positive_only_validation(self):
        validator = NumberFieldValidator()
        result = validator.validate(-5, {"positive_only": True}, "number")
        assert not result.is_valid
        assert result.errors[0]["error_type"] == "not_positive"

    def test_negative_only_validation(self):
        validator = NumberFieldValidator()
        result = validator.validate(5, {"negative_only": True}, "number")
        assert not result.is_valid
        assert result.errors[0]["error_type"] == "not_negative"

    def test_step_validation(self):
        validator = NumberFieldValidator()
        result = validator.validate(5, {"step": 3}, "number")
        assert not result.is_valid
        assert result.errors[0]["error_type"] == "invalid_step"


class TestDateFieldValidator:
    """Test date field validation"""

    def test_valid_date(self):
        validator = DateFieldValidator()
        result = validator.validate("2026-07-07", {}, "date")
        assert result.is_valid

    def test_invalid_date(self):
        validator = DateFieldValidator()
        result = validator.validate("not-a-date", {}, "date")
        assert not result.is_valid

    def test_disable_past_dates(self):
        validator = DateFieldValidator()
        result = validator.validate("2020-01-01", {"disable_past_dates": True}, "date")
        assert not result.is_valid
        assert result.errors[0]["error_type"] == "past_date_not_allowed"

    def test_disable_future_dates(self):
        validator = DateFieldValidator()
        result = validator.validate("2030-01-01", {"disable_future_dates": True}, "date")
        assert not result.is_valid
        assert result.errors[0]["error_type"] == "future_date_not_allowed"


class TestEmailFieldValidator:
    """Test email field validation"""

    def test_valid_email(self):
        validator = EmailFieldValidator()
        result = validator.validate("test@example.com", {}, "email")
        assert result.is_valid

    def test_invalid_email(self):
        validator = EmailFieldValidator()
        result = validator.validate("not-an-email", {}, "email")
        assert not result.is_valid


class TestPhoneFieldValidator:
    """Test phone field validation"""

    def test_valid_phone(self):
        validator = PhoneFieldValidator()
        result = validator.validate("555-1234567", {}, "phone")
        assert result.is_valid

    def test_invalid_phone_short(self):
        validator = PhoneFieldValidator()
        result = validator.validate("123", {}, "phone")
        assert not result.is_valid


class TestURLFieldValidator:
    """Test URL field validation"""

    def test_valid_url(self):
        validator = URLFieldValidator()
        result = validator.validate("https://example.com", {}, "url")
        assert result.is_valid

    def test_invalid_url(self):
        validator = URLFieldValidator()
        result = validator.validate("not-a-url", {}, "url")
        assert not result.is_valid


class TestRatingFieldValidator:
    """Test rating field validation"""

    def test_valid_rating(self):
        validator = RatingFieldValidator()
        result = validator.validate(4, {"max_stars": 5}, "rating")
        assert result.is_valid

    def test_invalid_rating_too_high(self):
        validator = RatingFieldValidator()
        result = validator.validate(6, {"max_stars": 5}, "rating")
        assert not result.is_valid

    def test_invalid_rating_too_low(self):
        validator = RatingFieldValidator()
        result = validator.validate(0, {"max_stars": 5}, "rating")
        assert not result.is_valid


class TestChoiceFieldValidator:
    """Test dropdown/radio/checkbox validation"""

    def test_valid_dropdown_option(self):
        validator = ChoiceFieldValidator()
        result = validator.validate(
            "blue",
            {},
            "dropdown",
            {"options": [{"value": "red"}, {"value": "blue"}]},
        )
        assert result.is_valid

    def test_invalid_dropdown_option(self):
        validator = ChoiceFieldValidator()
        result = validator.validate(
            "green",
            {},
            "dropdown",
            {"options": [{"value": "red"}, {"value": "blue"}]},
        )
        assert not result.is_valid
        assert result.errors[0]["error_type"] == "invalid_choice"

    def test_valid_checkbox_values(self):
        validator = ChoiceFieldValidator()
        result = validator.validate(
            ["a", "b"],
            {},
            "checkbox",
            {"options": [{"value": "a"}, {"value": "b"}, {"value": "c"}]},
        )
        assert result.is_valid

    def test_invalid_checkbox_values(self):
        validator = ChoiceFieldValidator()
        result = validator.validate(
            ["a", "z"],
            {},
            "checkbox",
            {"options": [{"value": "a"}, {"value": "b"}]},
        )
        assert not result.is_valid
        assert result.errors[0]["error_type"] == "invalid_choice"


class TestValidationService:
    """Test validation service routing"""

    def test_validate_text_field(self):
        result = ValidationService.validate_field("hello", "short_text", {"max_length": 3})
        assert not result.is_valid

    def test_validate_number_field(self):
        result = ValidationService.validate_field(100, "number", {"max_value": 50})
        assert not result.is_valid

    def test_validate_email_field(self):
        result = ValidationService.validate_field("test@example.com", "email", {})
        assert result.is_valid

    def test_validate_dropdown_field_with_options(self):
        result = ValidationService.validate_field(
            "blue",
            "dropdown",
            {},
            {"options": [{"value": "red"}, {"value": "blue"}]},
        )
        assert result.is_valid

    def test_validate_multiple_answers(self):
        answers = {
            "name": "John",
            "age": 25,
            "email": "john@example.com",
        }

        fields = {
            "name": {"field_type": "short_text", "validation_rules": {"min_length": 2}},
            "age": {"field_type": "number", "validation_rules": {"min_value": 18, "max_value": 100}},
            "email": {"field_type": "email", "validation_rules": {}},
        }

        results = ValidationService.validate_response_answers(answers, fields)
        assert all(r.is_valid for r in results.values())
