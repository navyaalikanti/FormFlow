/**
 * Conditional Logic Engine for FormFlow
 * Evaluates conditional rules and updates field states
 */

/**
 * Operators for evaluating conditions
 */
const OPERATORS = {
  equals: (value, comparison) => value === comparison,
  not_equals: (value, comparison) => value !== comparison,
  contains: (value, comparison) =>
    typeof value === "string" && value.includes(comparison),
  not_contains: (value, comparison) =>
    typeof value === "string" && !value.includes(comparison),
  greater_than: (value, comparison) =>
    (typeof value === "number" || typeof value === "string") && value > comparison,
  less_than: (value, comparison) =>
    (typeof value === "number" || typeof value === "string") && value < comparison,
  greater_or_equal: (value, comparison) =>
    (typeof value === "number" || typeof value === "string") && value >= comparison,
  less_or_equal: (value, comparison) =>
    (typeof value === "number" || typeof value === "string") && value <= comparison,
  is_empty: (value) =>
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0),
  is_not_empty: (value) =>
    value !== null &&
    value !== undefined &&
    value !== "" &&
    !(Array.isArray(value) && value.length === 0),
  in: (value, comparison) =>
    Array.isArray(comparison) && comparison.includes(value),
  not_in: (value, comparison) =>
    !Array.isArray(comparison) || !comparison.includes(value),
  any_of: (value, comparison) =>
    Array.isArray(value) &&
    Array.isArray(comparison) &&
    value.some((v) => comparison.includes(v)),
  all_of: (value, comparison) =>
    Array.isArray(value) &&
    Array.isArray(comparison) &&
    value.every((v) => comparison.includes(v)),
  matches_pattern: (value, comparison) => {
    try {
      const regex = new RegExp(comparison);
      return regex.test(String(value));
    } catch {
      return false;
    }
  },
};

/**
 * Evaluate a single condition
 */
function evaluateCondition(operator, value, comparisonValue) {
  const evaluator = OPERATORS[operator];
  if (!evaluator) {
    return false;
  }
  try {
    return evaluator(value, comparisonValue);
  } catch {
    return false;
  }
}

/**
 * Evaluate a single rule
 */
function evaluateRule(rule, responseAnswers) {
  const { source_field_key, operator, comparison_value } = rule;

  if (!source_field_key || !operator) {
    return false;
  }

  const sourceValue = responseAnswers[source_field_key];
  return evaluateCondition(operator, sourceValue, comparison_value);
}

/**
 * Evaluate a group of rules with AND/OR logic
 */
function evaluateRulesGroup(rules, responseAnswers, logicType = "AND") {
  if (!rules || rules.length === 0) {
    return true;
  }

  const results = rules.map((rule) => evaluateRule(rule, responseAnswers));

  if (logicType === "AND") {
    return results.every((r) => r);
  } else if (logicType === "OR") {
    return results.some((r) => r);
  } else {
    return results.every((r) => r); // Default to AND
  }
}

/**
 * Apply a single rule's action to field states
 */
function applyRuleAction(fieldStates, rule, isConditionMet) {
  const { action_type, action_config } = rule;
  const { target_field_key } = action_config;

  if (!target_field_key) {
    return fieldStates;
  }

  // Initialize field state if not present
  if (!fieldStates[target_field_key]) {
    fieldStates[target_field_key] = {};
  }

  // Apply the action based on condition
  if (isConditionMet) {
    // Condition is TRUE: apply the stated action
    switch (action_type) {
      case "show":
        fieldStates[target_field_key].is_hidden = false;
        break;
      case "hide":
        fieldStates[target_field_key].is_hidden = true;
        break;
      case "enable":
        fieldStates[target_field_key].is_disabled = false;
        break;
      case "disable":
        fieldStates[target_field_key].is_disabled = true;
        break;
      case "require":
        fieldStates[target_field_key].is_required = true;
        break;
      case "optional":
        fieldStates[target_field_key].is_required = false;
        break;
      default:
        break;
    }
  } else {
    // Condition is FALSE: apply the opposite action
    // This ensures fields return to their default state when conditions aren't met
    switch (action_type) {
      case "show":
        // If "show" condition is false, hide the field
        fieldStates[target_field_key].is_hidden = true;
        break;
      case "hide":
        // If "hide" condition is false, show the field
        fieldStates[target_field_key].is_hidden = false;
        break;
      case "enable":
        // If "enable" condition is false, disable the field
        fieldStates[target_field_key].is_disabled = true;
        break;
      case "disable":
        // If "disable" condition is false, enable the field
        fieldStates[target_field_key].is_disabled = false;
        break;
      case "require":
        // If "require" condition is false, make optional
        fieldStates[target_field_key].is_required = false;
        break;
      case "optional":
        // If "optional" condition is false, make required
        fieldStates[target_field_key].is_required = true;
        break;
      default:
        break;
    }
  }

  return fieldStates;
}

/**
 * Apply all conditional logic rules and return updated field states
 */
export function applyConditionalLogic(logicRules, responseAnswers, allFields) {
  // Initialize field states from original fields
  const fieldStates = {};
  for (const field of allFields) {
    fieldStates[field.field_key] = {
      is_hidden: field.is_hidden || false,
      is_disabled: false,
      is_required: field.is_required || false,
    };
  }

  // Apply each rule
  for (const rule of logicRules) {
    if (!rule.is_active) {
      continue;
    }

    const conditionMet = evaluateRule(rule, responseAnswers);
    applyRuleAction(fieldStates, rule, conditionMet);
  }

  return fieldStates;
}

/**
 * Get list of visible fields based on field states
 */
export function getVisibleFields(allFields, fieldStates) {
  return allFields.filter((field) => {
    const state = fieldStates[field.field_key] || {};
    const is_hidden = state.is_hidden !== undefined ? state.is_hidden : field.is_hidden;
    return !is_hidden;
  });
}

/**
 * Get updated validation rules considering conditional states
 */
export function getActiveValidationRules(allFields, fieldStates) {
  const activeRules = {};

  for (const field of allFields) {
    const state = fieldStates[field.field_key] || {};
    const is_hidden = state.is_hidden !== undefined ? state.is_hidden : field.is_hidden;

    // Skip hidden fields
    if (is_hidden) {
      continue;
    }

    // Update required status based on state
    const is_required = state.is_required !== undefined ? state.is_required : field.is_required;

    const validationRules = { ...field.validation_rules };
    if (is_required) {
      validationRules.required = true;
    }

    activeRules[field.field_key] = validationRules;
  }

  return activeRules;
}

/**
 * Get visibility map for all fields
 */
export function getFieldVisibilityMap(allFields, logicRules, responseAnswers) {
  const fieldStates = applyConditionalLogic(logicRules, responseAnswers, allFields);

  const visibilityMap = {};
  for (const field of allFields) {
    const state = fieldStates[field.field_key] || {};
    const is_hidden =
      state.is_hidden !== undefined ? state.is_hidden : field.is_hidden;
    visibilityMap[field.field_key] = !is_hidden;
  }

  return visibilityMap;
}

/**
 * Get complete field state map including all properties
 */
export function getFieldStateMap(allFields, logicRules, responseAnswers) {
  return applyConditionalLogic(logicRules, responseAnswers, allFields);
}

/**
 * Get fields affected by conditional logic changes
 */
export function getAffectedFields(allFields, logicRules, responseAnswers) {
  const fieldStates = applyConditionalLogic(logicRules, responseAnswers, allFields);

  const affected = [];
  for (const field of allFields) {
    const state = fieldStates[field.field_key] || {};
    const originalHidden = field.is_hidden || false;
    const originalRequired = field.is_required || false;

    const isHiddenChanged =
      state.is_hidden !== undefined && state.is_hidden !== originalHidden;
    const isRequiredChanged =
      state.is_required !== undefined && state.is_required !== originalRequired;

    if (isHiddenChanged || isRequiredChanged) {
      affected.push(field.field_key);
    }
  }

  return affected;
}

/**
 * Validate conditional logic rules for consistency
 */
export function validateConditionalLogicRules(rules, allFieldKeys) {
  const errors = {};

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const ruleErrors = [];

    // Check required fields
    if (!rule.source_field_key) {
      ruleErrors.push("Source field is required");
    }

    if (!rule.operator) {
      ruleErrors.push("Operator is required");
    }

    if (!rule.action_type) {
      ruleErrors.push("Action type is required");
    }

    if (!rule.action_config?.target_field_key) {
      ruleErrors.push("Target field is required");
    }

    // Check if fields exist
    if (rule.source_field_key && !allFieldKeys.includes(rule.source_field_key)) {
      ruleErrors.push(`Source field '${rule.source_field_key}' not found`);
    }

    if (
      rule.action_config?.target_field_key &&
      !allFieldKeys.includes(rule.action_config.target_field_key)
    ) {
      ruleErrors.push(
        `Target field '${rule.action_config.target_field_key}' not found`
      );
    }

    // Check if operator is valid
    if (rule.operator && !OPERATORS[rule.operator]) {
      ruleErrors.push(`Invalid operator: ${rule.operator}`);
    }

    // Check if action type is valid
    const validActions = ["show", "hide", "enable", "disable", "require", "optional"];
    if (rule.action_type && !validActions.includes(rule.action_type)) {
      ruleErrors.push(`Invalid action type: ${rule.action_type}`);
    }

    if (ruleErrors.length > 0) {
      errors[`rule_${i}`] = ruleErrors;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Check for circular dependencies in rules
 */
export function checkCircularDependencies(rules) {
  const errors = [];

  // Build dependency graph
  const dependencies = {};
  for (const rule of rules) {
    if (!rule.is_active) {
      continue;
    }

    const source = rule.source_field_key;
    const target = rule.action_config?.target_field_key;

    if (source && target) {
      if (!dependencies[source]) {
        dependencies[source] = new Set();
      }
      dependencies[source].add(target);
    }
  }

  // Check for cycles using DFS
  const visited = new Set();
  const recStack = new Set();

  const hasCycle = (node) => {
    visited.add(node);
    recStack.add(node);

    for (const neighbor of dependencies[node] || []) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) {
          return true;
        }
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }

    recStack.delete(node);
    return false;
  };

  for (const node of Object.keys(dependencies)) {
    if (!visited.has(node)) {
      if (hasCycle(node)) {
        errors.push(
          `Circular dependency detected involving field ${node}`
        );
      }
    }
  }

  return {
    hasCircularDependency: errors.length > 0,
    errors,
  };
}

/**
 * Get human-readable description of a rule
 */
export function describeRule(rule, fields) {
  const sourceField = fields.find((f) => f.field_key === rule.source_field_key)
  const targetField = fields.find(
    (f) => f.field_key === rule.action_config?.target_field_key
  )

  const sourceName = sourceField?.label || rule.source_field_key
  const targetName = targetField?.label || rule.action_config?.target_field_key

  return `If ${sourceName} ${rule.operator} ${JSON.stringify(
    rule.comparison_value
  )}, then ${rule.action_type} ${targetName}`
}
