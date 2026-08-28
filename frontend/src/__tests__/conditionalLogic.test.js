/**
 * Tests for frontend conditional logic utilities
 */
import {
  applyConditionalLogic,
  getVisibleFields,
  getFieldStateMap,
  validateConditionalLogicRules,
  checkCircularDependencies,
} from '../utils/conditionalLogic'

describe('conditional logic utilities', () => {
  describe('applyConditionalLogic', () => {
    it('should show field when condition is met', () => {
      const rules = [
        {
          source_field_key: 'type',
          operator: 'equals',
          comparison_value: 'business',
          action_type: 'show',
          action_config: { target_field_key: 'company_name' },
          is_active: true,
        },
      ]

      const fields = [
        { field_key: 'type', is_hidden: false },
        { field_key: 'company_name', is_hidden: true },
      ]

      const states = applyConditionalLogic(rules, { type: 'business' }, fields)
      expect(states.company_name.is_hidden).toBe(false)
    })

    it('should hide field when condition is met', () => {
      const rules = [
        {
          source_field_key: 'type',
          operator: 'equals',
          comparison_value: 'personal',
          action_type: 'hide',
          action_config: { target_field_key: 'company_name' },
          is_active: true,
        },
      ]

      const fields = [
        { field_key: 'type', is_hidden: false },
        { field_key: 'company_name', is_hidden: false },
      ]

      const states = applyConditionalLogic(rules, { type: 'personal' }, fields)
      expect(states.company_name.is_hidden).toBe(true)
    })

    it('should require field when condition is met', () => {
      const rules = [
        {
          source_field_key: 'type',
          operator: 'equals',
          comparison_value: 'business',
          action_type: 'require',
          action_config: { target_field_key: 'company_name' },
          is_active: true,
        },
      ]

      const fields = [
        { field_key: 'type', is_hidden: false, is_required: false },
        { field_key: 'company_name', is_hidden: false, is_required: false },
      ]

      const states = applyConditionalLogic(rules, { type: 'business' }, fields)
      expect(states.company_name.is_required).toBe(true)
    })

    it('should not apply inactive rules', () => {
      const rules = [
        {
          source_field_key: 'type',
          operator: 'equals',
          comparison_value: 'business',
          action_type: 'hide',
          action_config: { target_field_key: 'company_name' },
          is_active: false,
        },
      ]

      const fields = [
        { field_key: 'type', is_hidden: false },
        { field_key: 'company_name', is_hidden: false },
      ]

      const states = applyConditionalLogic(rules, { type: 'business' }, fields)
      expect(states.company_name.is_hidden).toBe(false)
    })
  })

  describe('getVisibleFields', () => {
    it('should return only visible fields', () => {
      const fields = [
        { field_key: 'field1', is_hidden: false },
        { field_key: 'field2', is_hidden: true },
        { field_key: 'field3', is_hidden: false },
      ]

      const fieldStates = {
        field1: { is_hidden: false },
        field2: { is_hidden: true },
        field3: { is_hidden: false },
      }

      const visible = getVisibleFields(fields, fieldStates)
      expect(visible).toHaveLength(2)
      expect(visible.map((f) => f.field_key)).toContain('field1')
      expect(visible.map((f) => f.field_key)).toContain('field3')
    })
  })

  describe('getFieldStateMap', () => {
    it('should return correct state map', () => {
      const rules = [
        {
          source_field_key: 'show_details',
          operator: 'equals',
          comparison_value: true,
          action_type: 'show',
          action_config: { target_field_key: 'details' },
          is_active: true,
        },
      ]

      const fields = [
        { field_key: 'show_details', is_hidden: false, is_required: false },
        { field_key: 'details', is_hidden: true, is_required: false },
      ]

      const states = getFieldStateMap(fields, rules, { show_details: true })
      expect(states.details.is_hidden).toBe(false)
    })
  })

  describe('validateConditionalLogicRules', () => {
    it('should validate valid rule', () => {
      const rules = [
        {
          source_field_key: 'type',
          operator: 'equals',
          comparison_value: 'business',
          action_type: 'show',
          action_config: { target_field_key: 'company_name' },
        },
      ]

      const fieldKeys = ['type', 'company_name']
      const { isValid, errors } = validateConditionalLogicRules(rules, fieldKeys)
      expect(isValid).toBe(true)
      expect(Object.keys(errors)).toHaveLength(0)
    })

    it('should detect missing source field', () => {
      const rules = [
        {
          operator: 'equals',
          action_type: 'show',
          action_config: { target_field_key: 'company_name' },
        },
      ]

      const fieldKeys = ['company_name']
      const { isValid, errors } = validateConditionalLogicRules(rules, fieldKeys)
      expect(isValid).toBe(false)
      expect(errors.rule_0).toBeDefined()
    })

    it('should detect invalid operator', () => {
      const rules = [
        {
          source_field_key: 'type',
          operator: 'invalid_operator',
          action_type: 'show',
          action_config: { target_field_key: 'company_name' },
        },
      ]

      const fieldKeys = ['type', 'company_name']
      const { isValid, errors } = validateConditionalLogicRules(rules, fieldKeys)
      expect(isValid).toBe(false)
    })

    it('should detect nonexistent field', () => {
      const rules = [
        {
          source_field_key: 'nonexistent',
          operator: 'equals',
          action_type: 'show',
          action_config: { target_field_key: 'company_name' },
        },
      ]

      const fieldKeys = ['type', 'company_name']
      const { isValid, errors } = validateConditionalLogicRules(rules, fieldKeys)
      expect(isValid).toBe(false)
    })
  })

  describe('checkCircularDependencies', () => {
    it('should detect no circular dependencies', () => {
      const rules = [
        {
          source_field_key: 'a',
          action_config: { target_field_key: 'b' },
          is_active: true,
        },
        {
          source_field_key: 'b',
          action_config: { target_field_key: 'c' },
          is_active: true,
        },
      ]

      const { hasCircularDependency, errors } = checkCircularDependencies(rules)
      expect(hasCircularDependency).toBe(false)
      expect(errors).toHaveLength(0)
    })

    it('should detect circular dependencies', () => {
      const rules = [
        {
          source_field_key: 'a',
          action_config: { target_field_key: 'b' },
          is_active: true,
        },
        {
          source_field_key: 'b',
          action_config: { target_field_key: 'a' },
          is_active: true,
        },
      ]

      const { hasCircularDependency, errors } = checkCircularDependencies(rules)
      expect(hasCircularDependency).toBe(true)
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should ignore inactive rules', () => {
      const rules = [
        {
          source_field_key: 'a',
          action_config: { target_field_key: 'b' },
          is_active: true,
        },
        {
          source_field_key: 'b',
          action_config: { target_field_key: 'a' },
          is_active: false,
        },
      ]

      const { hasCircularDependency, errors } = checkCircularDependencies(rules)
      expect(hasCircularDependency).toBe(false)
    })
  })
})
