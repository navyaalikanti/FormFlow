/**
 * MultiPagePreview – Full-screen modal form preview with Google Forms style
 * Each section = one page with Previous/Next navigation
 * Validates only fields on current page before advancing
 * 
 * MODAL BEHAVIOR:
 * - Covers entire viewport
 * - Blurred backdrop hides builder UI
 * - Centered card with max-width 850px
 * - Prevents background scrolling
 */
import { useState, useEffect } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { getFieldStateMap, getVisibleFields } from '../../utils/conditionalLogic'
import { validateFormResponse } from '../../utils/validation'
import ValidationRuleDisplay from './ValidationRuleDisplay'

/**
 * Check if a section title is a default/auto-generated title
 */
function isDefaultSectionTitle(title) {
  if (!title || !title.trim()) return true
  const trimmed = title.trim()
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

export default function MultiPagePreview({
  form,
  conditionalLogicRules = [],
  onClose,
}) {
  const [currentPage, setCurrentPage] = useState(0)
  const [answers, setAnswers] = useState({})
  const [fieldStates, setFieldStates] = useState({})
  const [validationErrors, setValidationErrors] = useState({})
  const [slideDirection, setSlideDirection] = useState('next')

  // Prevent background scroll while preview is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [])

  // ========== CRITICAL: FIXED SECTION STRUCTURE ==========
  // Do NOT flatten or transform sections
  // Each section object MUST contain its own fields array
  const allSections = form?.sections || []
  
  // Count ALL sections (including empty ones for debugging)
  const allSectionsCount = allSections.length
  
  // Filter to sections that have at least one field
  const sectionsWithFields = allSections.filter((section) => {
    return section && section.fields && Array.isArray(section.fields) && section.fields.length > 0
  })
  
  // These are the actual pages to display
  const pages = sectionsWithFields
  const totalPages = pages.length
  
  // Current page section (undefined if no pages)
  const currentSection = totalPages > 0 ? pages[currentPage] : null
  const currentPageFields = currentSection?.fields || []
  
  // Flatten ALL fields from ALL sections (for conditional logic)
  const allFields = allSections.flatMap((sec) => sec.fields || [])

  // DEBUG: Detailed logging
  useEffect(() => {
    console.log('[MultiPagePreview] Load Debug:', {
      formId: form?.id,
      formTitle: form?.title,
      allSectionsFromAPI: allSectionsCount,
      allSectionDetails: allSections.map((s, idx) => ({
        index: idx,
        sectionId: s.id,
        sectionTitle: s.title || '(no title)',
        fieldCount: s.fields?.length || 0,
        fieldKeys: s.fields?.map(f => f.field_key || f.label) || [],
      })),
      filteredToSectionsWithFields: sectionsWithFields.length,
      totalPages: totalPages,
      currentPage: currentPage,
      currentSectionFields: currentPageFields.length,
    })
  }, [form, allSections, sectionsWithFields, totalPages, currentPage, currentPageFields])

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

    // Clear validation error for this field
    setValidationErrors((prev) => {
      const updated = { ...prev }
      delete updated[fieldKey]
      return updated
    })
  }

  const validateCurrentPage = () => {
    const fieldsOnPage = currentPageFields.map((f) => ({
      field_key: f.field_key,
      field_type: f.field_type,
      validation_rules: f.validation_rules,
      is_required: fieldStates[f.field_key]?.is_required !== undefined
        ? fieldStates[f.field_key].is_required
        : f.is_required,
    }))

    const errors = validateFormResponse(answers, fieldsOnPage)
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const getNextVisiblePage = (startPage) => {
    // Find next page that has at least one visible field
    for (let i = startPage; i < pages.length; i++) {
      const pageFields = pages[i]?.fields || []
      const hasVisibleField = pageFields.some((field) => {
        const state = fieldStates[field.field_key]
        return !state?.is_hidden
      })
      if (hasVisibleField) {
        return i
      }
    }
    return currentPage // Stay on current page if no visible next page
  }

  const getPreviousVisiblePage = (startPage) => {
    // Find previous page that has at least one visible field
    for (let i = startPage; i >= 0; i--) {
      const pageFields = pages[i]?.fields || []
      const hasVisibleField = pageFields.some((field) => {
        const state = fieldStates[field.field_key]
        return !state?.is_hidden
      })
      if (hasVisibleField) {
        return i
      }
    }
    return currentPage // Stay on current page if no visible prev page
  }

  const handleNext = () => {
    if (validateCurrentPage()) {
      setSlideDirection('next')
      const nextPage = getNextVisiblePage(currentPage + 1)
      setCurrentPage(nextPage)
      setValidationErrors({})
    }
  }

  const handlePrevious = () => {
    setSlideDirection('prev')
    const prevPage = getPreviousVisiblePage(currentPage - 1)
    setCurrentPage(prevPage)
    setValidationErrors({})
  }

  const handleSubmit = () => {
    if (validateCurrentPage()) {
      alert('Form validation passed! Ready to submit.')
      // In a real app, this would submit to the backend
    }
  }

  const isLastPage = currentPage === totalPages - 1

  // Guard: Only render if we have at least one section with fields
  if (totalPages === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md">
        <div className="hide-scrollbar w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900" style={{ maxWidth: '850px', width: 'min(850px, 95vw)' }}>
          <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white px-6 py-6 dark:border-slate-800 dark:from-slate-900 dark:to-slate-800">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{form?.title}</h2>
              {form?.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 whitespace-pre-wrap">
                  {form.description}
                </p>
              )}
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No sections with fields</p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 flex-shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              aria-label="Close preview"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-16">
            <p className="text-center text-slate-500 dark:text-slate-400">
              {allSectionsCount > 0 
                ? `Found ${allSectionsCount} section(s) but none have fields. Add fields to sections.`
                : 'No sections found in form'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md">
      <div className="hide-scrollbar w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900" style={{ maxWidth: '850px', width: 'min(850px, 95vw)' }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white px-6 py-6 dark:border-slate-800 dark:from-slate-900 dark:to-slate-800 sm:py-8">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              {form?.title}
            </h2>
            {form?.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 whitespace-pre-wrap">
                {form.description}
              </p>
            )}
            {totalPages > 1 && (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Page {currentPage + 1} of {totalPages}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Close preview"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form Content */}
        <div className="px-6 py-8 sm:px-8 sm:py-10">
          <div className="space-y-6">
            {/* Section Title – only show if custom title */}
            {currentSection?.title && !isDefaultSectionTitle(currentSection.title) && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                  {currentSection.title}
                </h3>
                {currentSection.description && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    {currentSection.description}
                  </p>
                )}
              </div>
            )}

            {/* Fields */}
            <div className="space-y-6">
              {currentPageFields.map((field) => (
                <PreviewField
                  key={field.field_key}
                  field={field}
                  value={answers[field.field_key]}
                  onChange={(value) => handleFieldChange(field.field_key, value)}
                  state={fieldStates[field.field_key]}
                  errors={validationErrors}
                />
              ))}
            </div>

            {/* Validation errors */}
            {Object.keys(validationErrors).length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  {Object.keys(validationErrors).length} validation error(s) on this page
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-6 dark:border-slate-800 dark:bg-slate-950 sm:px-8">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            {currentPage > 0 ? (
              <button
                onClick={handlePrevious}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                ← Previous
              </button>
            ) : (
              <div />
            )}

            {!isLastPage ? (
              <button
                onClick={handleNext}
                className="flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 active:scale-95 dark:bg-orange-600 dark:hover:bg-orange-700"
              >
                <span>Next</span>
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="w-full rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 active:scale-95 dark:bg-orange-600 dark:hover:bg-orange-700 sm:w-auto"
              >
                Submit Form
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
