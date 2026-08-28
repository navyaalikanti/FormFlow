"""Conditional logic engine for FormFlow fields"""

from __future__ import annotations

from typing import Any
from uuid import UUID


class ConditionalLogicEvaluator:
    """Evaluates conditional logic rules"""

    OPERATORS = {
        "equals": lambda v, c: v == c,
        "not_equals": lambda v, c: v != c,
        "contains": lambda v, c: isinstance(v, str) and c in v,
        "not_contains": lambda v, c: isinstance(v, str) and c not in v,
        "greater_than": lambda v, c: isinstance(v, (int, float)) and v > c,
        "less_than": lambda v, c: isinstance(v, (int, float)) and v < c,
        "greater_or_equal": lambda v, c: isinstance(v, (int, float)) and v >= c,
        "less_or_equal": lambda v, c: isinstance(v, (int, float)) and v <= c,
        "is_empty": lambda v, c: v is None or v == "" or (isinstance(v, list) and len(v) == 0),
        "is_not_empty": lambda v, c: v is not None and v != "" and not (isinstance(v, list) and len(v) == 0),
        "in": lambda v, c: v in c if isinstance(c, list) else False,
        "not_in": lambda v, c: v not in c if isinstance(c, list) else True,
        "any_of": lambda v, c: isinstance(v, list) and any(item in c for item in v) if isinstance(c, list) else False,
        "all_of": lambda v, c: isinstance(v, list) and all(item in c for item in v) if isinstance(c, list) else False,
        "matches_pattern": lambda v, c: isinstance(v, str) and bool(__import__("re").search(c, v)),
    }

    @classmethod
    def evaluate_condition(
        cls,
        operator: str,
        value: Any,
        comparison_value: Any,
    ) -> bool:
        """Evaluate a single condition"""
        evaluator = cls.OPERATORS.get(operator)
        if evaluator is None:
            return False
        try:
            return evaluator(value, comparison_value)
        except (TypeError, ValueError):
            return False

    @classmethod
    def evaluate_rule(
        cls,
        rule: dict[str, Any],
        response_answers: dict[str, Any],
    ) -> bool:
        """Evaluate a single logic rule against response answers"""
        source_field_key = rule.get("source_field_key")
        operator = rule.get("operator")
        comparison_value = rule.get("comparison_value")

        if not source_field_key or not operator:
            return False

        # Get the value from response answers
        source_value = response_answers.get(source_field_key)

        return cls.evaluate_condition(operator, source_value, comparison_value)

    @classmethod
    def evaluate_rules_group(
        cls,
        rules: list[dict[str, Any]],
        response_answers: dict[str, Any],
        logic_type: str = "AND",
    ) -> bool:
        """Evaluate a group of rules with AND/OR logic"""
        if not rules:
            return True

        results = [cls.evaluate_rule(rule, response_answers) for rule in rules]

        if logic_type == "AND":
            return all(results)
        elif logic_type == "OR":
            return any(results)
        else:
            return all(results)  # Default to AND


class FieldAction:
    """Represents an action to apply to a field"""

    def __init__(
        self,
        action_type: str,
        target_field_key: str,
        config: dict[str, Any] | None = None,
    ):
        self.action_type = action_type  # show, hide, enable, disable, require, optional
        self.target_field_key = target_field_key
        self.config = config or {}

    def to_dict(self) -> dict[str, Any]:
        return {
            "action_type": self.action_type,
            "target_field_key": self.target_field_key,
            "config": self.config,
        }


class ConditionalLogicEngine:
    """Main engine that manages conditional logic rules and evaluations"""

    def __init__(self):
        self.evaluator = ConditionalLogicEvaluator()

    def apply_logic_rules(
        self,
        logic_rules: list[dict[str, Any]],
        response_answers: dict[str, Any],
        field_states: dict[str, dict[str, Any]],
    ) -> dict[str, dict[str, Any]]:
        """Apply all conditional logic rules and return updated field states"""
        updated_states = dict(field_states)

        for rule in logic_rules:
            if not rule.get("is_active", True):
                continue

            # Check if condition is met
            condition_met = self.evaluator.evaluate_rule(rule, response_answers)

            if not condition_met:
                continue

            # Apply action
            action_type = rule.get("action_type")
            action_config = rule.get("action_config", {})
            target_field_key = action_config.get("target_field_key")

            if not target_field_key:
                continue

            # Initialize field state if not present
            if target_field_key not in updated_states:
                updated_states[target_field_key] = {}

            # Apply the action
            if action_type == "show":
                updated_states[target_field_key]["is_hidden"] = False
            elif action_type == "hide":
                updated_states[target_field_key]["is_hidden"] = True
            elif action_type == "enable":
                updated_states[target_field_key]["is_disabled"] = False
            elif action_type == "disable":
                updated_states[target_field_key]["is_disabled"] = True
            elif action_type == "require":
                updated_states[target_field_key]["is_required"] = True
            elif action_type == "optional":
                updated_states[target_field_key]["is_required"] = False

        return updated_states

    def get_visible_fields(
        self,
        all_fields: list[dict[str, Any]],
        field_states: dict[str, dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Get list of visible fields based on current field states"""
        visible = []
        for field in all_fields:
            field_key = field.get("field_key")
            state = field_states.get(field_key, {})

            # Field is visible if not hidden and field is not marked as is_hidden=True
            is_hidden = state.get("is_hidden", field.get("is_hidden", False))

            if not is_hidden:
                visible.append(field)

        return visible

    def get_active_validations(
        self,
        all_fields: list[dict[str, Any]],
        field_states: dict[str, dict[str, Any]],
    ) -> dict[str, dict[str, Any]]:
        """Get validation rules only for active/visible fields"""
        active_validations = {}
        for field in all_fields:
            field_key = field.get("field_key")
            state = field_states.get(field_key, {})

            # Skip hidden fields
            is_hidden = state.get("is_hidden", field.get("is_hidden", False))
            if is_hidden:
                continue

            # Add required flag based on state
            is_required = state.get("is_required", field.get("is_required", False))

            validation_rules = dict(field.get("validation_rules", {}))
            if is_required:
                validation_rules["required"] = True

            active_validations[field_key] = validation_rules

        return active_validations

    def get_field_visibility_map(
        self,
        all_fields: list[dict[str, Any]],
        logic_rules: list[dict[str, Any]],
        response_answers: dict[str, Any],
    ) -> dict[str, bool]:
        """Get visibility status for all fields"""
        # Initialize all field states
        field_states: dict[str, dict[str, Any]] = {}
        for field in all_fields:
            field_states[field.get("field_key")] = {
                "is_hidden": field.get("is_hidden", False),
                "is_disabled": False,
                "is_required": field.get("is_required", False),
            }

        # Apply conditional logic
        updated_states = self.apply_logic_rules(logic_rules, response_answers, field_states)

        # Return visibility map
        return {
            field_key: not state.get("is_hidden", False)
            for field_key, state in updated_states.items()
        }

    def get_field_state_map(
        self,
        all_fields: list[dict[str, Any]],
        logic_rules: list[dict[str, Any]],
        response_answers: dict[str, Any],
    ) -> dict[str, dict[str, Any]]:
        """Get complete state for all fields including visibility, disabled, required"""
        # Initialize all field states
        field_states: dict[str, dict[str, Any]] = {}
        for field in all_fields:
            field_states[field.get("field_key")] = {
                "is_hidden": field.get("is_hidden", False),
                "is_disabled": False,
                "is_required": field.get("is_required", False),
            }

        # Apply conditional logic
        return self.apply_logic_rules(logic_rules, response_answers, field_states)


class ConditionalLogicValidator:
    """Validates conditional logic rules for consistency and errors"""

    @staticmethod
    def validate_rule(
        rule: dict[str, Any],
        all_fields: dict[str, dict[str, Any]],
    ) -> tuple[bool, list[str]]:
        """Validate a single rule. Returns (is_valid, errors)"""
        errors: list[str] = []

        # Check required fields
        if not rule.get("source_field_key"):
            errors.append("Source field is required")

        if not rule.get("operator"):
            errors.append("Operator is required")

        if not rule.get("action_type"):
            errors.append("Action type is required")

        action_config = rule.get("action_config", {})
        if not action_config.get("target_field_key"):
            errors.append("Target field is required")

        # Check if fields exist
        if rule.get("source_field_key") and rule.get("source_field_key") not in all_fields:
            errors.append(f"Source field '{rule['source_field_key']}' not found")

        if action_config.get("target_field_key") and action_config["target_field_key"] not in all_fields:
            errors.append(f"Target field '{action_config['target_field_key']}' not found")

        # Check if operator is valid
        if rule.get("operator") not in ConditionalLogicEvaluator.OPERATORS:
            errors.append(f"Invalid operator: {rule.get('operator')}")

        # Check if action type is valid
        valid_actions = {"show", "hide", "enable", "disable", "require", "optional"}
        if rule.get("action_type") not in valid_actions:
            errors.append(f"Invalid action type: {rule.get('action_type')}")

        return len(errors) == 0, errors

    @staticmethod
    def validate_rules(
        rules: list[dict[str, Any]],
        all_fields: dict[str, dict[str, Any]],
    ) -> tuple[bool, dict[str, list[str]]]:
        """Validate multiple rules. Returns (all_valid, error_dict)"""
        all_valid = True
        error_dict: dict[str, list[str]] = {}

        for i, rule in enumerate(rules):
            is_valid, errors = ConditionalLogicValidator.validate_rule(rule, all_fields)
            if not is_valid:
                all_valid = False
                error_dict[f"rule_{i}"] = errors

        return all_valid, error_dict

    @staticmethod
    def check_circular_dependencies(
        rules: list[dict[str, Any]],
    ) -> tuple[bool, list[str]]:
        """Check for circular dependencies in conditional logic"""
        errors: list[str] = []

        # Build dependency graph
        dependencies: dict[str, set[str]] = {}
        for rule in rules:
            if not rule.get("is_active", True):
                continue

            source = rule.get("source_field_key")
            target = rule.get("action_config", {}).get("target_field_key")

            if source and target:
                if source not in dependencies:
                    dependencies[source] = set()
                dependencies[source].add(target)

        # Check for cycles using DFS
        visited: set[str] = set()
        rec_stack: set[str] = set()

        def has_cycle(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)

            for neighbor in dependencies.get(node, set()):
                if neighbor not in visited:
                    if has_cycle(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True

            rec_stack.remove(node)
            return False

        for node in dependencies:
            if node not in visited:
                if has_cycle(node):
                    errors.append(f"Circular dependency detected involving field {node}")

        return len(errors) == 0, errors
