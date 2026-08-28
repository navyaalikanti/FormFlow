/**
 * PublicFormPage – Professional public form viewer (Google Forms style)
 * Route: /f/:token
 * No authentication required
 * Single-page centered form layout
 */
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ChevronRight, Copy, Check } from 'lucide-react'
import api from '../../lib/api'
import { getFieldStateMap } from '../../utils/conditionalLogic'
import { validateField, validateFormResponse } from '../../utils/validation'
import { buildSubmissionAnswers, submitPublicForm } from '../../services/formSubmissionService'
import ValidationRuleDisplay from '../Builder/ValidationRuleDisplay'
import FileUpload from '../../components/file-upload/FileUpload'

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] font-normal leading-snug text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-700'

function PreviewField({ field, value, onChange, state, errors, linkToken }) {
  const isHidden = state?.is_hidden || false
  const isDisabled = state?.is_disabled || false
  const isRequired = state?.is_required !== undefined ? state.is_required : field.is_required
  const fieldErrors = errors?.[field.field_key] || []

  if (isHidden) {
    return null
  }

  const showError = fieldErrors.length > 0

  return (
    <div className="space-y-2">
      <label className="flex items-baseline gap-0.5 text-[14px] font-semibold leading-snug text-slate-800 dark:text-slate-200">
        <span>{field.label}</span>
        {isRequired && <span className="ml-0.5 text-orange-500">*</span>}
        {isDisabled && <span className="ml-2 text-xs font-normal text-slate-400">(disabled)</span>}
        <ValidationRuleDisplay field={field} validationRules={field.validation_rules} />
      </label>

      {field.description && <p className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{field.description}</p>}

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
        <FileUpload
          field={field}
          linkToken={linkToken}
          value={value}
          onChange={onChange}
          disabled={isDisabled}
          externalErrors={fieldErrors}
          className={showError ? 'ring-1 ring-red-500/20' : ''}
        />
      )}

      {/* Validation rules shown via tooltip icon in the label above */}

      {showError && (
        <div className="mt-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-900/20">
          <ul className="space-y-0.5">
            {fieldErrors.map((error, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-[12.5px] font-medium text-red-600 dark:text-red-400">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{error.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {field.helper_text && !showError && (
        <p className="text-[12.5px] text-slate-500 dark:text-slate-400">{field.helper_text}</p>
      )}
    </div>
  )
}

function isDefaultSectionTitle(title) {
  if (!title || !title.trim()) return true
  const trimmed = title.trim()
  return trimmed === 'Untitled Section' || /^Section\s+\d+$/.test(trimmed)
}

export default function PublicFormPage() {
  const { token } = useParams()
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [answers, setAnswers] = useState({})
  const [fieldStates, setFieldStates] = useState({})
  const [validationErrors, setValidationErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submittedAt, setSubmittedAt] = useState(null)
  const [responseId, setResponseId] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleCopyId = () => {
    if (!responseId) return
    navigator.clipboard.writeText(responseId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    setAnswers({})
    setValidationErrors({})
    setSubmitSuccess(false)
    setCurrentPage(0)
    setResponseId(null)
    setSubmittedAt(null)
  }

  // Load form
  useEffect(() => {
    let cancelled = false

    const loadForm = async () => {
      try {
        setLoading(true)
        const response = await api.get(`/public/forms/${token}`)
        if (!cancelled) {
          setForm(response.data)
        }
      } catch (err) {
        if (!cancelled) {
          if (err?.response?.status === 404) {
            setError('Form not found. The link may be invalid or expired.')
          } else if (err?.response?.status === 410) {
            const detail = err?.response?.data?.detail
            if (detail === 'response_limit_reached') {
              setError('This form is no longer accepting responses as the maximum number of responses has been reached.')
            } else if (detail === 'deadline_passed') {
              setError('This form is no longer accepting responses as the submission deadline has passed.')
            } else {
              setError('This form is archived and no longer accepts responses.')
            }
          } else {
            setError(err?.response?.data?.detail || 'Failed to load form')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadForm()
    return () => { cancelled = true }
  }, [token])

  // Setup pagination
  const allSections = form?.sections || []
  const sectionsWithFields = allSections.filter(
    (s) => s && s.fields && Array.isArray(s.fields) && s.fields.length > 0
  )
  const pages = sectionsWithFields
  const totalPages = pages.length
  const currentSection = totalPages > 0 ? pages[currentPage] : null
  const currentPageFields = currentSection?.fields || []
  const allFields = allSections.flatMap((s) => s.fields || [])
  const isLastPage = currentPage === totalPages - 1

  const buildValidationErrorMap = (field, value, nextAnswers) => {
    if (!field) {
      return []
    }

    const nextFieldStates = getFieldStateMap(allFields, form?.conditional_logic_rules || [], nextAnswers)
    const currentState = nextFieldStates[field.field_key] || {}
    const isHidden = currentState.is_hidden || false
    const isRequired =
      currentState.is_required !== undefined ? currentState.is_required : field.is_required

    if (isHidden) {
      return []
    }

    if (
      isRequired &&
      (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0))
    ) {
      return [
        {
          type: 'required',
          message: `${field.label || field.field_key} is required`,
        },
      ]
    }

    if (
      value === null ||
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    ) {
      return []
    }

    return validateField(value, field.field_type, field.validation_rules || {}, field)
  }

  // Update field states based on conditional logic
  useEffect(() => {
    const newStates = getFieldStateMap(allFields, form?.conditional_logic_rules || [], answers)
    setFieldStates(newStates)
  }, [answers, allFields, form?.conditional_logic_rules])

  // Handlers
  const handleFieldChange = (fieldKey, value) => {
    const nextAnswers = {
      ...answers,
      [fieldKey]: value,
    }

    setAnswers(nextAnswers)

    const field = allFields.find((item) => item.field_key === fieldKey)
    const nextFieldStates = getFieldStateMap(allFields, form?.conditional_logic_rules || [], nextAnswers)
    const fieldErrors = buildValidationErrorMap(field, value, nextAnswers)

    setValidationErrors((prev) => {
      const updated = {}

      for (const [existingFieldKey, existingErrors] of Object.entries(prev)) {
        if (!nextFieldStates[existingFieldKey]?.is_hidden) {
          updated[existingFieldKey] = existingErrors
        }
      }

      if (fieldErrors.length > 0) {
        updated[fieldKey] = fieldErrors
      } else {
        delete updated[fieldKey]
      }

      return updated
    })
  }

  const validateCurrentPage = () => {
    const fieldsOnPage = currentPageFields.map((f) => ({
      field_key: f.field_key,
      field_type: f.field_type,
      validation_rules: f.validation_rules,
      options: f.options || [],
      label: f.label,
      is_hidden: fieldStates[f.field_key]?.is_hidden !== undefined
        ? fieldStates[f.field_key].is_hidden
        : f.is_hidden,
      is_required: fieldStates[f.field_key]?.is_required !== undefined
        ? fieldStates[f.field_key].is_required
        : f.is_required,
    }))

    const errors = validateFormResponse(answers, fieldsOnPage)
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNext = () => {
    if (validateCurrentPage()) {
      if (!isLastPage) {
        setCurrentPage((prev) => prev + 1)
      } else {
        handleSubmit()
      }
      setValidationErrors({})
    }
  }

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1)
      setValidationErrors({})
    }
  }

  const handleSubmit = async () => {
    if (isSubmitting || submitSuccess) {
      return
    }
    
    setSubmitError(null)

    const currentFieldStates = getFieldStateMap(allFields, form?.conditional_logic_rules || [], answers)

    const allFieldsForValidation = allFields.map((f) => ({
      field_key: f.field_key,
      field_type: f.field_type,
      validation_rules: f.validation_rules,
      options: f.options || [],
      label: f.label,
      is_hidden: currentFieldStates[f.field_key]?.is_hidden !== undefined
        ? currentFieldStates[f.field_key].is_hidden
        : f.is_hidden,
      is_required: currentFieldStates[f.field_key]?.is_required !== undefined
        ? currentFieldStates[f.field_key].is_required
        : f.is_required,
    }))

    const clientErrors = validateFormResponse(answers, allFieldsForValidation)
    if (Object.keys(clientErrors).length > 0) {
      setValidationErrors(clientErrors)
      return
    }

    const submissionAnswers = buildSubmissionAnswers(answers, currentFieldStates)

    setIsSubmitting(true)
    try {
      const result = await submitPublicForm(token, submissionAnswers, {})

      if (result.success) {
        setValidationErrors({})
        setSubmitSuccess(true)
        setResponseId(result.responseId || null)
        setSubmittedAt(result.submittedAt || new Date().toISOString())
        return
      }

      if (result.validationErrors) {
        setValidationErrors(result.validationErrors)
      } else if (result.error) {
        if (result.error === 'response_limit_reached') {
          setSubmitError('This form is no longer accepting responses as the maximum number of responses has been reached.')
        } else if (result.error === 'deadline_passed') {
          setSubmitError('This form is no longer accepting responses as the submission deadline has passed.')
        } else if (result.error === 'archived') {
          setSubmitError('This form is archived and no longer accepts responses.')
        } else {
          setSubmitError(result.error)
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-orange-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading form…</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-900/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto mb-4 dark:bg-red-900/30">
            <AlertCircle size={24} className="text-red-600 dark:text-red-400" />
          </div>
          <h1 className="mb-2 text-lg font-semibold text-red-900 dark:text-red-100">Form Unavailable</h1>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    )
  }

  // Archived state
  if (form?.status === 'archived') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900 dark:bg-amber-900/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mx-auto mb-4 dark:bg-amber-900/30">
            <AlertCircle size={24} className="text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="mb-2 text-lg font-semibold text-amber-900 dark:text-amber-100">Form Archived</h1>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            This form is archived and no longer accepts new responses.
          </p>
        </div>
      </div>
    )
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:py-16">
        <div className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800/70">
          <div className="border-t-2 border-orange-500/60 bg-white px-6 py-10 sm:px-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex items-center gap-1.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <CheckCircle2 size={20} strokeWidth={2.25} />
                </div>
                <span className="text-[10px] font-semibold tracking-normal text-emerald-600 dark:text-emerald-400">
                  Successful
                </span>
              </div>
              
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Form Submitted Successfully
              </h1>
              
              <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Thank you! Your response has been securely recorded.
              </p>
            </div>
          </div>

          <div className="space-y-4 px-6 pb-6 sm:px-8">
            {/* Response ID Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40 transition duration-250">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Response ID</p>
                  <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-950 dark:text-slate-100 select-all">{responseId || '—'}</p>
                  <p className="mt-2 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
                    Store your Response ID for future reference.
                  </p>
                </div>
                {responseId && (
                  <button
                    onClick={handleCopyId}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-orange-500 hover:border-orange-200 hover:bg-orange-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-orange-500/30 dark:hover:bg-orange-500/10 dark:hover:text-orange-300 transition duration-200"
                    title="Copy Response ID"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                )}
              </div>
            </div>

            {/* Submission Time Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40 transition duration-250">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Submission Time</p>
              <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-100">
                {submittedAt ? new Date(submittedAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                }) : '—'}
              </p>
            </div>
          </div>

          {/* Action footer */}
          <div className="border-t border-slate-100 dark:border-slate-800/60 px-6 py-6 sm:px-8 flex flex-col items-center gap-4">
            <button
              onClick={handleReset}
              className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 active:scale-[0.99] transition duration-200 text-center"
            >
              Submit another response
            </button>
            
            <a href="/" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-350 transition duration-200">
              <span>Powered by</span>
              <span className="font-medium text-orange-500">FormFlow</span>
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Only show "not found" if form is null (API returned null) or if API returned 404
  // A valid form object should always render, even if it has no pages
  if (form === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <p>No form content available</p>
        </div>
      </div>
    )
  }

  // Handle case where form exists but has no pages with fields
  if (totalPages === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:py-16">
        <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-slate-900">
          {/* Header with orange top border */}
          <div className="border-t-4 border-orange-500 bg-gradient-to-br from-slate-50 to-white px-6 py-8 dark:from-slate-900 dark:to-slate-800 sm:px-8 sm:py-10">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3 sm:text-4xl">
              {form.title}
            </h1>
            {form.description && (
              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {form.description}
              </p>
            )}
          </div>

          {/* Empty state */}
          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900 dark:bg-amber-900/20">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                This form has no fields yet.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:py-16">
      <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-slate-900">
        {/* Header with orange top border */}
        <div className="border-t-4 border-orange-500 bg-gradient-to-br from-slate-50 to-white px-6 py-8 dark:from-slate-900 dark:to-slate-800 sm:px-8 sm:py-10">
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white sm:text-[32px] leading-tight">
            {form.title}
          </h1>
          {form.description && (
            <p className="mt-3 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {form.description}
            </p>
          )}
          {totalPages > 1 && (
            <p className="mt-4 text-[13px] font-medium text-slate-400 dark:text-slate-500">
              Page {currentPage + 1} of {totalPages}
            </p>
          )}
        </div>

        {/* Form body */}
        <div className="px-6 py-8 sm:px-8 sm:py-10">
          {/* Section title */}
          {currentSection?.title && !isDefaultSectionTitle(currentSection.title) && (
            <div className="mb-8">
              <h2 className="text-[17px] font-semibold tracking-tight text-slate-800 dark:text-slate-100">
                {currentSection.title}
              </h2>
              {currentSection.description && (
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
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
                linkToken={token}
              />
            ))}
          </div>

          {/* Validation errors */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="mt-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                {Object.keys(validationErrors).length} field{Object.keys(validationErrors).length !== 1 ? 's have' : ' has'} errors — please review above.
              </span>
            </div>
          )}
        </div>

        {/* Footer with navigation */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-6 dark:border-slate-800 dark:bg-slate-950 sm:px-8">
          
          {submitError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                {submitError}
              </p>
            </div>
          )}

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
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 active:scale-95 dark:bg-orange-600 dark:hover:bg-orange-700"
              >
                <span>Next</span>
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
              className="w-full rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold tracking-wide text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-orange-600 dark:hover:bg-orange-700 sm:w-auto"
              >
                {isSubmitting ? 'Submitting…' : 'Submit Form'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
