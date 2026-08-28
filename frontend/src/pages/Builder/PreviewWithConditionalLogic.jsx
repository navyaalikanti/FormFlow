/**
 * PreviewWithConditionalLogic – Form preview mode with live conditional logic evaluation
 * Shows how fields dynamically appear/disappear/enable based on user selections
 */
import { useState, useEffect } from 'react'
import { ChevronDown, Eye, EyeOff } from 'lucide-react'
import { applyConditionalLogic, getVisibleFields, getFieldStateMap } from '../../utils/conditionalLogic'
import { validateField, validateFormResponse } from '../../utils/validation'
import ValidationRuleDisplay from './ValidationRuleDisplay'

/**
 * Check if a section title is a default/auto-generated title
 */
function isDefaultSectionTitle(title) {
  if (!title || !title.trim()) return true
  const trimmed = title.trim()
  // Check for patterns like "Untitled Section", "Section 1", "Section 2", etc.
  return trimmed === 'Untitled Section' || /^Section\s+\d+$/.test(trimmed)
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-700'

function PreviewField({ field, value, onChange, state, errors }) {
  const isHidden = state?.is_hidden || false
  const isDisabled = state?.is_disabled || false
  const isRequired = state?.is_required !== undefined ? state.is_required : field.is_required
  const fieldErrors = errors?.[field.field_key] || []

  if (isHidden) {
    return null
  }

  const showError = fieldErrors.length > 0

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-0 text-sm font-medium text-slate-700 dark:text-slate-300">
        <span>{field.label}</span>
        {isRequired && <span className="text-orange-500">*</span>}
        {isDisabled && <span className="ml-2 text-xs text-slate-400">(disabled)</span>}
        <ValidationRuleDisplay field={field} validationRules={field.validation_rules} />
      </label>

      {field.description && <p className="text-xs text-slate-500 dark:text-slate-400">{field.description}</p>}

      {(field.field_type === 'short_text' || field.field_type === 'text') && (
        <input
          type="text"
          className={`${inputCls} ${showError ? 'border-red-500 focus:ring-red-500/10' : ''}`}
          value={value || ''}
          placeholder={field.placeholder}
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.field_type === 'paragraph' && (
        <textarea
          className={`${inputCls} resize-none ${showError ? 'border-red-500 focus:ring-red-500/10' : ''}`}
          rows={field.config?.rows || 4}
          value={value || ''}
          placeholder={field.placeholder}
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.field_type === 'email' && (
        <input
          type="email"
          className={`${inputCls} ${showError ? 'border-red-500 focus:ring-red-500/10' : ''}`}
          value={value || ''}
          placeholder={field.placeholder}
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.field_type === 'phone' && (
        <input
          type="tel"
          className={`${inputCls} ${showError ? 'border-red-500 focus:ring-red-500/10' : ''}`}
          value={value || ''}
          placeholder={field.placeholder || '+1 (555) 000-0000'}
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.field_type === 'url' && (
        <input
          type="url"
          className={`${inputCls} ${showError ? 'border-red-500 focus:ring-red-500/10' : ''}`}
          value={value || ''}
          placeholder={field.placeholder || 'https://example.com'}
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.field_type === 'number' && (
        <input
          type="number"
          className={`${inputCls} ${showError ? 'border-red-500 focus:ring-red-500/10' : ''}`}
          value={value || ''}
          placeholder={field.placeholder}
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
        />
      )}

      {field.field_type === 'date' && (
        <input
          type="date"
          className={`${inputCls} ${showError ? 'border-red-500 focus:ring-red-500/10' : ''}`}
          value={value || ''}
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.field_type === 'time' && (
        <input
          type="time"
          className={`${inputCls} ${showError ? 'border-red-500 focus:ring-red-500/10' : ''}`}
          value={value || ''}
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.field_type === 'dropdown' && (
        <select
          className={`${inputCls} ${showError ? 'border-red-500 focus:ring-red-500/10' : ''}`}
          value={value || ''}
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select an option</option>
          {(field.options || []).map((opt) => (
            <option key={opt.option_value} value={opt.option_value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {field.field_type === 'radio' && (
        <div className="space-y-2">
          {(field.options || []).map((opt) => (
            <label key={opt.option_value} className="flex items-center gap-2">
              <input
                type="radio"
                name={field.field_key}
                value={opt.option_value}
                checked={value === opt.option_value}
                disabled={isDisabled}
                onChange={(e) => onChange(e.target.value)}
                className="rounded-full border-slate-300"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">{opt.label}</span>
            </label>
          ))}
        </div>
      )}

      {field.field_type === 'checkbox' && (
        <div className="space-y-2">
          {(field.options || []).map((opt) => (
            <label key={opt.option_value} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={(value || []).includes(opt.option_value)}
                disabled={isDisabled}
                onChange={(e) => {
                  const newValue = [...(value || [])]
                  if (e.target.checked) {
                    newValue.push(opt.option_value)
                  } else {
                    newValue.splice(newValue.indexOf(opt.option_value), 1)
                  }
                  onChange(newValue)
                }}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">{opt.label}</span>
            </label>
          ))}
        </div>
      )}

      {field.field_type === 'rating' && (
        <div className="flex gap-2">
          {Array.from({ length: field.config?.max_stars || 5 }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => onChange(idx + 1)}
              disabled={isDisabled}
              className={`text-2xl transition ${
                value >= idx + 1
                  ? 'text-orange-400'
                  : 'text-slate-300 hover:text-orange-200 dark:text-slate-600 dark:hover:text-orange-800'
              } disabled:cursor-not-allowed`}
            >
              ★
            </button>
          ))}
        </div>
      )}

      {field.field_type === 'file' && (
        <div>
          <div className={`flex h-24 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition ${
            showError
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
              : 'border-slate-300 bg-slate-50 hover:border-orange-400 hover:bg-orange-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-orange-500 dark:hover:bg-orange-900/20'
          } text-sm text-slate-400`}>
            <div className="text-center">
              <p className="font-medium">Click or drag files here</p>
              {field.validation_rules?.allowed_file_types?.length > 0 && (
                <p className="mt-1 text-xs">
                  Supported: {field.validation_rules.allowed_file_types.join(', ')}
                </p>
              )}
              {field.validation_rules?.max_file_size_mb && (
                <p className="text-xs">Maximum size: {field.validation_rules.max_file_size_mb} MB</p>
              )}
            </div>
          </div>
          {field.validation_rules?.max_file_count && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Max files: {field.validation_rules.max_file_count}
            </p>
          )}
        </div>
      )}

      {/* Validation rules shown via tooltip icon in the label above */}

      {/* Error messages */}
      {showError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 dark:border-red-800 dark:bg-red-900/20">
          <ul className="space-y-1">
            {fieldErrors.map((error, idx) => (
              <li key={idx} className="text-xs text-red-600 dark:text-red-400">
                • {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {field.helper_text && !showError && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{field.helper_text}</p>
      )}
    </div>
  )
}

export default function PreviewWithConditionalLogic({
  form,
  conditionalLogicRules = [],
  onClose,
}) {
  const [answers, setAnswers] = useState({})
  const [fieldStates, setFieldStates] = useState({})
  const [validationErrors, setValidationErrors] = useState({})
  const [showValidation, setShowValidation] = useState(false)

  // Get all fields from sections
  const allFields = form?.sections?.flatMap((sec) => sec.fields) || []

  // Update field states whenever answers change (conditional logic)
  useEffect(() => {
    const newStates = getFieldStateMap(allFields, conditionalLogicRules, answers)
    setFieldStates(newStates)
  }, [answers, allFields, conditionalLogicRules])

  const handleFieldChange = (fieldKey, value) => {
    setAnswers((prev) => ({
      ...prev,
      [fieldKey]: value,
    }))

    // Clear validation error for this field when user starts typing
    setValidationErrors((prev) => {
      const updated = { ...prev }
      delete updated[fieldKey]
      return updated
    })

    // Live validation: validate against field rules as user types
    if (showValidation) {
      const field = allFields.find((f) => f.field_key === fieldKey)
      if (field && field.validation_rules) {
        const fieldData = {
          field_key: field.field_key,
          field_type: field.field_type,
          validation_rules: field.validation_rules,
          is_required: fieldStates[fieldKey]?.is_required !== undefined
            ? fieldStates[fieldKey].is_required
            : field.is_required,
        }
        
        const errors = validateFormResponse({ [fieldKey]: value }, [fieldData])
        setValidationErrors((prev) => {
          const updated = { ...prev }
          if (Object.keys(errors).length > 0) {
            updated[fieldKey] = errors[fieldKey]
          } else {
            delete updated[fieldKey]
          }
          return updated
        })
      }
    }
  }

  const handleSubmit = () => {
    // Get visible fields based on current states
    const visibleFields = getVisibleFields(allFields, fieldStates)

    // Validate only visible fields
    const visibleFieldsData = visibleFields.map((f) => ({
      field_key: f.field_key,
      field_type: f.field_type,
      validation_rules: f.validation_rules,
      is_required: fieldStates[f.field_key]?.is_required !== undefined
        ? fieldStates[f.field_key].is_required
        : f.is_required,
    }))

    const errors = validateFormResponse(answers, visibleFieldsData)
    setValidationErrors(errors)
    setShowValidation(true)

    if (Object.keys(errors).length === 0) {
      alert('Form validation passed! Ready to submit.')
      // In a real app, this would submit to the backend
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/60">
      <div className="flex h-full max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{form?.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Preview with Conditional Logic</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Form fields */}
        <div className="hide-scrollbar flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Info banner */}
            

            {/* Sections */}
            {form?.sections?.map((section, sectionIdx) => (
              <div key={sectionIdx} className="space-y-4">
                {section.title && !isDefaultSectionTitle(section.title) && (
                  <div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{section.title}</h3>
                    {section.description && (
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{section.description}</p>
                    )}
                  </div>
                )}

                {/* Fields in section */}
                <div className="space-y-4">
                  {section.fields?.map((field) => (
                    <PreviewField
                      key={field.field_key}
                      field={field}
                      value={answers[field.field_key]}
                      onChange={(value) => handleFieldChange(field.field_key, value)}
                      state={fieldStates[field.field_key]}
                      errors={showValidation ? validationErrors : {}}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          {showValidation && Object.keys(validationErrors).length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-xs font-medium text-red-700 dark:text-red-300">
                {Object.keys(validationErrors).length} validation error(s)
              </p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full rounded-lg bg-orange-500 px-4 py-2.5 font-medium text-white transition hover:bg-orange-600 active:scale-95 dark:bg-orange-600 dark:hover:bg-orange-700"
          >
            Validate & Submit
          </button>
        </div>
      </div>
    </div>
  )
}
