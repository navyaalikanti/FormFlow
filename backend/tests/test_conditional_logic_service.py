"""Tests for conditional logic service"""

import pytest
from app.services.conditional_logic_service import (
    ConditionalLogicEvaluator,
    ConditionalLogicEngine,
    ConditionalLogicValidator,
)


class TestConditionalLogicEvaluator:
    """Test conditional logic evaluation"""

    def test_equals_operator(self):
        assert ConditionalLogicEvaluator.evaluate_condition("equals", "red", "red")
        assert not ConditionalLogicEvaluator.evaluate_condition("equals", "red", "blue")

    def test_not_equals_operator(self):
        assert ConditionalLogicEvaluator.evaluate_condition("not_equals", "red", "blue")
        assert not ConditionalLogicEvaluator.evaluate_condition("not_equals", "red", "red")

    def test_contains_operator(self):
        assert ConditionalLogicEvaluator.evaluate_condition("contains", "hello world", "world")
        assert not ConditionalLogicEvaluator.evaluate_condition("contains", "hello world", "xyz")

    def test_greater_than_operator(self):
        assert ConditionalLogicEvaluator.evaluate_condition("greater_than", 10, 5)
        assert not ConditionalLogicEvaluator.evaluate_condition("greater_than", 5, 10)

    def test_less_than_operator(self):
        assert ConditionalLogicEvaluator.evaluate_condition("less_than", 5, 10)
        assert not ConditionalLogicEvaluator.evaluate_condition("less_than", 10, 5)

    def test_is_empty_operator(self):
        assert ConditionalLogicEvaluator.evaluate_condition("is_empty", "", None)
        assert ConditionalLogicEvaluator.evaluate_condition("is_empty", None, None)
        assert ConditionalLogicEvaluator.evaluate_condition("is_empty", [], None)
        assert not ConditionalLogicEvaluator.evaluate_condition("is_empty", "hello", None)

    def test_is_not_empty_operator(self):
        assert ConditionalLogicEvaluator.evaluate_condition("is_not_empty", "hello", None)
        assert not ConditionalLogicEvaluator.evaluate_condition("is_not_empty", "", None)

    def test_in_operator(self):
        assert ConditionalLogicEvaluator.evaluate_condition("in", "red", ["red", "blue", "green"])
        assert not ConditionalLogicEvaluator.evaluate_condition("in", "yellow", ["red", "blue", "green"])

    def test_any_of_operator(self):
        assert ConditionalLogicEvaluator.evaluate_condition(
            "any_of", ["red", "yellow"], ["red", "blue", "green"]
        )
        assert not ConditionalLogicEvaluator.evaluate_condition(
            "any_of", ["yellow", "purple"], ["red", "blue", "green"]
        )

    def test_all_of_operator(self):
        assert ConditionalLogicEvaluator.evaluate_condition(
            "all_of", ["red", "blue"], ["red", "blue", "green"]
        )
        assert not ConditionalLogicEvaluator.evaluate_condition(
            "all_of", ["red", "yellow"], ["red", "blue", "green"]
        )


class TestConditionalLogicEngine:
    """Test conditional logic engine"""

    def test_apply_show_action(self):
        rules = [
            {
                "source_field_key": "color",
                "operator": "equals",
                "comparison_value": "red",
                "action_type": "show",
                "action_config": {"target_field_key": "details"},
                "is_active": True,
            }
        ]

        fields = [
            {"field_key": "color", "is_hidden": False, "is_required": False},
            {"field_key": "details", "is_hidden": True, "is_required": False},
        ]

        engine = ConditionalLogicEngine()
        states = engine.apply_logic_rules(rules, {"color": "red"}, {"details": {"is_hidden": True}})

        assert states["details"]["is_hidden"] is False

    def test_apply_hide_action(self):
        rules = [
            {
                "source_field_key": "color",
                "operator": "equals",
                "comparison_value": "red",
                "action_type": "hide",
                "action_config": {"target_field_key": "details"},
                "is_active": True,
            }
        ]

        fields = [
            {"field_key": "color", "is_hidden": False, "is_required": False},
            {"field_key": "details", "is_hidden": False, "is_required": False},
        ]

        engine = ConditionalLogicEngine()
        states = engine.apply_logic_rules(rules, {"color": "red"}, {"details": {"is_hidden": False}})

        assert states["details"]["is_hidden"] is True

    def test_apply_require_action(self):
        rules = [
            {
                "source_field_key": "type",
                "operator": "equals",
                "comparison_value": "business",
                "action_type": "require",
                "action_config": {"target_field_key": "company_name"},
                "is_active": True,
            }
        ]

        engine = ConditionalLogicEngine()
        states = engine.apply_logic_rules(rules, {"type": "business"}, {"company_name": {"is_required": False}})

        assert states["company_name"]["is_required"] is True

    def test_apply_optional_action(self):
        rules = [
            {
                "source_field_key": "type",
                "operator": "equals",
                "comparison_value": "personal",
                "action_type": "optional",
                "action_config": {"target_field_key": "company_name"},
                "is_active": True,
            }
        ]

        engine = ConditionalLogicEngine()
        states = engine.apply_logic_rules(rules, {"type": "personal"}, {"company_name": {"is_required": True}})

        assert states["company_name"]["is_required"] is False

    def test_get_field_visibility_map(self):
        rules = [
            {
                "source_field_key": "show_address",
                "operator": "equals",
                "comparison_value": True,
                "action_type": "show",
                "action_config": {"target_field_key": "address"},
                "is_active": True,
            }
        ]

        fields = [
            {"field_key": "show_address", "is_hidden": False, "is_required": False},
            {"field_key": "address", "is_hidden": True, "is_required": False},
        ]

        engine = ConditionalLogicEngine()
        visibility = engine.get_field_visibility_map(fields, rules, {"show_address": True})

        assert visibility["show_address"] is True
        assert visibility["address"] is True

    def test_inactive_rule_not_applied(self):
        rules = [
            {
                "source_field_key": "color",
                "operator": "equals",
                "comparison_value": "red",
                "action_type": "hide",
                "action_config": {"target_field_key": "details"},
                "is_active": False,
            }
        ]

        engine = ConditionalLogicEngine()
        states = engine.apply_logic_rules(rules, {"color": "red"}, {"details": {"is_hidden": False}})

        assert states["details"]["is_hidden"] is False


class TestConditionalLogicValidator:
    """Test conditional logic rule validation"""

    def test_validate_valid_rule(self):
        rule = {
            "source_field_key": "status",
            "operator": "equals",
            "comparison_value": "active",
            "action_type": "show",
            "action_config": {"target_field_key": "details"},
        }

        fields = {
            "status": {"field_type": "dropdown"},
            "details": {"field_type": "text"},
        }

        is_valid, errors = ConditionalLogicValidator.validate_rule(rule, fields)
        assert is_valid
        assert len(errors) == 0

    def test_validate_missing_source_field(self):
        rule = {
            "operator": "equals",
            "comparison_value": "active",
            "action_type": "show",
            "action_config": {"target_field_key": "details"},
        }

        fields = {"details": {"field_type": "text"}}

        is_valid, errors = ConditionalLogicValidator.validate_rule(rule, fields)
        assert not is_valid
        assert len(errors) > 0

    def test_validate_invalid_operator(self):
        rule = {
            "source_field_key": "status",
            "operator": "invalid_operator",
            "action_type": "show",
            "action_config": {"target_field_key": "details"},
        }

        fields = {
            "status": {"field_type": "dropdown"},
            "details": {"field_type": "text"},
        }

        is_valid, errors = ConditionalLogicValidator.validate_rule(rule, fields)
        assert not is_valid

    def test_validate_nonexistent_field(self):
        rule = {
            "source_field_key": "nonexistent",
            "operator": "equals",
            "action_type": "show",
            "action_config": {"target_field_key": "details"},
        }

        fields = {"details": {"field_type": "text"}}

        is_valid, errors = ConditionalLogicValidator.validate_rule(rule, fields)
        assert not is_valid

    def test_check_circular_dependencies_no_cycle(self):
        rules = [
            {
                "source_field_key": "a",
                "action_config": {"target_field_key": "b"},
                "is_active": True,
            },
            {
                "source_field_key": "b",
                "action_config": {"target_field_key": "c"},
                "is_active": True,
            },
        ]

        is_valid, errors = ConditionalLogicValidator.check_circular_dependencies(rules)
        assert is_valid
        assert len(errors) == 0

    def test_check_circular_dependencies_with_cycle(self):
        rules = [
            {
                "source_field_key": "a",
                "action_config": {"target_field_key": "b"},
                "is_active": True,
            },
            {
                "source_field_key": "b",
                "action_config": {"target_field_key": "a"},
                "is_active": True,
            },
        ]

        is_valid, errors = ConditionalLogicValidator.check_circular_dependencies(rules)
        assert not is_valid
        assert len(errors) > 0
