/**
 * Tests for frontend validation utilities
 */
import { validateField, validateFormResponse, hasValidationErrors } from '../utils/validation'

describe('validation utilities', () => {
  describe('validateField', () => {
    it('should validate text field with min length', () => {
      const errors = validateField('ab', 'short_text', { min_length: 3 })
      expect(errors).toHaveLength(1)
      expect(errors[0].type).toBe('min_length')
    })

    it('should validate text field with max length', () => {
      const errors = validateField('abcde', 'short_text', { max_length: 3 })
      expect(errors).toHaveLength(1)
      expect(errors[0].type).toBe('max_length')
    })

    it('should validate number field with min value', () => {
      const errors = validateField(5, 'number', { min_value: 10 })
      expect(errors).toHaveLength(1)
      expect(errors[0].type).toBe('below_minimum')
    })

    it('should validate number field with integer only', () => {
      const errors = validateField(3.14, 'number', { integer_only: true })
      expect(errors).toHaveLength(1)
      expect(errors[0].type).toBe('not_integer')
    })

    it('should validate email field', () => {
      const errors = validateField('invalid-email', 'email', {})
      expect(errors).toHaveLength(1)
      expect(errors[0].type).toBe('invalid_email')
    })

    it('should validate dropdown field options', () => {
      const field = {
        options: [
          { option_value: 'red' },
          { option_value: 'blue' },
        ],
      }

      const errors = validateField('green', 'dropdown', {}, field)
      expect(errors).toHaveLength(1)
      expect(errors[0].type).toBe('invalid_choice')
    })

    it('should validate checkbox field options', () => {
      const field = {
        options: [
          { option_value: 'a' },
          { option_value: 'b' },
        ],
      }

      const errors = validateField(['a', 'z'], 'checkbox', {}, field)
      expect(errors).toHaveLength(1)
      expect(errors[0].type).toBe('invalid_choice')
    })

    it('should validate date field', () => {
      const errors = validateField('not-a-date', 'date', {})
      expect(errors).toHaveLength(1)
      expect(errors[0].type).toBe('invalid_date')
    })

    it('should validate rating field', () => {
      const errors = validateField(6, 'rating', { max_stars: 5 })
      expect(errors).toHaveLength(1)
      expect(errors[0].type).toBe('invalid_rating_range')
    })

    it('should pass validation for empty non-required fields', () => {
      const errors = validateField('', 'short_text', {})
      expect(errors).toHaveLength(0)
    })

    it('should pass validation for valid values', () => {
      const errors = validateField('valid text', 'short_text', { min_length: 3, max_length: 20 })
      expect(errors).toHaveLength(0)
    })
  })

  describe('validateFormResponse', () => {
    it('should validate all fields in a form', () => {
      const answers = {
        name: 'John',
        age: 25,
        email: 'john@example.com',
      }

      const fields = [
        { field_key: 'name', field_type: 'short_text', validation_rules: { min_length: 2 }, is_required: true },
        { field_key: 'age', field_type: 'number', validation_rules: { min_value: 18 }, is_required: true },
        { field_key: 'email', field_type: 'email', validation_rules: {}, is_required: true },
      ]

      const errors = validateFormResponse(answers, fields)
      expect(Object.keys(errors)).toHaveLength(0)
    })

    it('should detect required field errors', () => {
      const answers = {
        name: 'John',
        age: '',
      }

      const fields = [
        { field_key: 'name', field_type: 'short_text', is_required: true },
        { field_key: 'age', field_type: 'number', is_required: true },
      ]

      const errors = validateFormResponse(answers, fields)
      expect(errors.age).toBeDefined()
      expect(errors.age[0].type).toBe('required')
    })

    it('should skip validation for empty non-required fields', () => {
      const answers = {
        optional_field: '',
      }

      const fields = [{ field_key: 'optional_field', field_type: 'short_text', is_required: false }]

      const errors = validateFormResponse(answers, fields)
      expect(Object.keys(errors)).toHaveLength(0)
    })

    it('should skip hidden fields', () => {
      const answers = {
        hidden_field: 'invalid-email',
      }

      const fields = [
        {
          field_key: 'hidden_field',
          field_type: 'email',
          is_required: true,
          is_hidden: true,
        },
      ]

      const errors = validateFormResponse(answers, fields)
      expect(Object.keys(errors)).toHaveLength(0)
    })
  })

  describe('hasValidationErrors', () => {
    it('should return true when errors exist', () => {
      const errors = { field1: [{ message: 'error' }] }
      expect(hasValidationErrors(errors)).toBe(true)
    })

    it('should return false when no errors', () => {
      const errors = {}
      expect(hasValidationErrors(errors)).toBe(false)
    })
  })
})
