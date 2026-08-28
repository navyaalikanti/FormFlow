/**
 * Form Submission Service - Handles client-side validation and server submission
 */
import api from '../lib/api'
import { validateFormResponse, hasValidationErrors } from '../utils/validation'
import { getFieldStateMap, getVisibleFields } from '../utils/conditionalLogic'

/**
 * Prepare form data for submission
 */
export function prepareFormSubmission(answers, form, conditionalLogicRules = []) {
  const allFields = form?.sections?.flatMap((sec) => sec.fields) || []

  // Get current field states based on answers and conditional logic
  const fieldStates = getFieldStateMap(allFields, conditionalLogicRules, answers)

  // Get visible fields only
  const visibleFields = getVisibleFields(allFields, fieldStates)

  // Build field data for validation (only visible fields)
  const fieldsForValidation = visibleFields.map((f) => ({
    field_key: f.field_key,
    field_type: f.field_type,
    validation_rules: f.validation_rules || {},
    is_required:
      fieldStates[f.field_key]?.is_required !== undefined
        ? fieldStates[f.field_key].is_required
        : f.is_required,
  }))

  // Validate answers
  const validationErrors = validateFormResponse(answers, fieldsForValidation)

  return {
    isValid: !hasValidationErrors(validationErrors),
    validationErrors,
    fieldStates,
    visibleFields,
    fieldsForValidation,
    answers,
  }
}

export function buildSubmissionAnswers(answers, fieldStates = {}) {
  const filteredAnswers = {}

  for (const [fieldKey, value] of Object.entries(answers || {})) {
    if (fieldStates[fieldKey]?.is_hidden) {
      continue
    }

    if (
      value === null ||
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)
    ) {
      continue
    }

    if (Array.isArray(value)) {
      filteredAnswers[fieldKey] = value.map((item) => {
        if (typeof item === 'string') {
          return item
        }
        if (item && typeof item === 'object') {
          return item.file_key || item.fileKey || item.storage_key || item.object_path || item.value || item.name || item.id
        }
        return item
      }).filter(Boolean)
      continue
    }

    if (typeof value === 'object') {
      filteredAnswers[fieldKey] = value.file_key || value.fileKey || value.storage_key || value.object_path || value.value || value.name || value.id
      continue
    }

    filteredAnswers[fieldKey] = value
  }

  return filteredAnswers
}

/**
 * Normalize validation errors from either the client validator map or the backend array.
 */
export function normalizeValidationErrors(validationErrors) {
  if (!validationErrors) {
    return {}
  }

  if (!Array.isArray(validationErrors)) {
    return validationErrors
  }

  const normalized = {}

  for (const error of validationErrors) {
    const fieldKey = error.field_key || error.fieldKey
    if (!fieldKey) {
      continue
    }

    if (!normalized[fieldKey]) {
      normalized[fieldKey] = []
    }

    normalized[fieldKey].push({
      type: error.type || error.error_type || 'validation_error',
      message: error.message || error.error_message || 'Validation failed',
    })
  }

  return normalized
}

/**
 * Submit form response to backend
 */
export async function submitFormResponse(formId, answers, metadata = {}, apiBaseUrl = '/api/v1') {
  try {
    const response = await api.post(`/v1/forms/${formId}/responses`, {
      answers,
      metadata,
    })

    return {
      success: true,
      responseId: response.data.response_id,
      message: response.data.message || 'Form submitted successfully',
    }
  } catch (error) {
    const status = error?.response?.status
    const errorData = error?.response?.data

    if (status === 422) {
      const serverValidationErrors = normalizeValidationErrors(errorData?.detail?.errors || [])
      return {
        success: false,
        validationErrors: serverValidationErrors,
        message: errorData?.detail?.message || 'Validation failed',
      }
    }

    return {
      success: false,
      error: error?.response?.data?.detail || error.message,
      message: 'An error occurred while submitting the form',
    }
  }
}

export async function submitPublicForm(linkToken, answers, metadata = {}) {
  try {
    const response = await api.post(`/public/forms/${linkToken}/submit`, {
      answers,
      metadata,
    })

    return {
      success: true,
      responseId: response.data.response_id,
      submittedAt: response.data.submitted_at,
      message: 'Form submitted successfully',
    }
  } catch (error) {
    const status = error?.response?.status
    const errorData = error?.response?.data

    if (status === 422) {
      const serverValidationErrors = normalizeValidationErrors(errorData?.detail?.errors || [])
      return {
        success: false,
        validationErrors: serverValidationErrors,
        message: errorData?.detail?.message || 'Validation failed',
      }
    }

    return {
      success: false,
      error: error?.response?.data?.detail || error.message,
      message: 'An error occurred while submitting the form',
    }
  }
}

export async function fetchFormResponses(formId, formVersionId = null, page = 1, pageSize = 10, fieldId = null, fieldValue = null) {
  const params = {
    ...(formVersionId ? { form_version_id: formVersionId } : {}),
    page,
    page_size: pageSize,
  }
  if (fieldId) params.field_id = fieldId;
  if (fieldValue) params.field_value = fieldValue;

  const response = await api.get(`/v1/forms/${formId}/responses`, { params })
  return response.data
}

export async function getPublicForm(linkToken) {
  const response = await api.get(`/public/forms/${linkToken}`)
  return response.data
}

export async function getPublicFormVersion(versionToken) {
  const response = await api.get(`/public/forms/version/${versionToken}`)
  return response.data
}

export async function getPublicFormStatus(linkToken) {
  const response = await api.get(`/public/forms/${linkToken}/status`)
  return response.data
}

export async function deleteFormResponse(formId, responseId) {
  const response = await api.delete(`/v1/forms/${formId}/responses/${responseId}`)
  return response.data
}

export async function deleteFormResponsesBulk(formId, responseIds) {
  const response = await api.delete(`/v1/forms/${formId}/responses/bulk`, {
    data: { response_ids: responseIds }
  })
  return response.data
}


/**
 * Validate and submit form in one operation
 */
export async function validateAndSubmitForm(formId, answers, form, conditionalLogicRules, metadata, apiBaseUrl) {
  // Step 1: Client-side validation
  const preparation = prepareFormSubmission(answers, form, conditionalLogicRules)

  if (!preparation.isValid) {
    return {
      success: false,
      validationErrors: preparation.validationErrors,
      message: 'Form validation failed. Please check errors below.',
      stage: 'client_validation',
    }
  }

  // Step 2: Server submission
  const submission = await submitFormResponse(formId, answers, metadata, apiBaseUrl)

  return {
    ...submission,
    stage: 'submission',
  }
}

/**
 * Format validation errors for display
 */
export function formatValidationErrorsForDisplay(validationErrors) {
  const normalizedErrors = normalizeValidationErrors(validationErrors)
  const formatted = {}

  for (const [fieldKey, errors] of Object.entries(normalizedErrors)) {
    formatted[fieldKey] = errors.map((error) => ({
      message: error.message,
      type: error.type,
    }))
  }

  return formatted
}

/**
 * Get error summary for display
 */
export function getErrorSummary(validationErrors) {
  const normalizedErrors = normalizeValidationErrors(validationErrors)
  const errorCount = Object.keys(normalizedErrors).length
  const errorMessages = []

  for (const [fieldKey, errors] of Object.entries(normalizedErrors)) {
    if (errors.length > 0) {
      errorMessages.push(`${fieldKey}: ${errors[0].message}`)
    }
  }

  return {
    totalErrors: errorCount,
    messages: errorMessages,
    summary: `${errorCount} field${errorCount !== 1 ? 's' : ''} with error${errorCount !== 1 ? 's' : ''}`,
  }
}

/**
 * Check if specific field has errors
 */
export function hasFieldError(validationErrors, fieldKey) {
  const normalizedErrors = normalizeValidationErrors(validationErrors)
  return normalizedErrors && normalizedErrors[fieldKey] && normalizedErrors[fieldKey].length > 0
}

/**
 * Get error message for specific field
 */
export function getFieldErrorMessage(validationErrors, fieldKey) {
  if (!hasFieldError(validationErrors, fieldKey)) {
    return null
  }

  const errors = normalizeValidationErrors(validationErrors)[fieldKey]
  return errors[0].message
}

/**
 * Get all error messages for specific field
 */
export function getFieldErrorMessages(validationErrors, fieldKey) {
  if (!hasFieldError(validationErrors, fieldKey)) {
    return []
  }

  return normalizeValidationErrors(validationErrors)[fieldKey].map((error) => error.message)
}

/**
 * Simulate form submission (for testing)
 */
export async function simulateFormSubmission(answers, form, conditionalLogicRules) {
  const preparation = prepareFormSubmission(answers, form, conditionalLogicRules)

  return {
    ...preparation,
    timestamp: new Date().toISOString(),
    fieldCount: preparation.visibleFields.length,
    answerCount: Object.keys(answers).length,
  }
}

/**
 * Export form responses as JSON
 */
export function exportFormResponse(formId, responseId, answers, form, submittedAt) {
  return {
    formId,
    responseId,
    submittedAt: submittedAt || new Date().toISOString(),
    answers,
    formTitle: form?.title,
    fieldCount: Object.keys(answers).length,
  }
}

/**
 * Get submission analytics
 */
export function getSubmissionAnalytics(answers, form, conditionalLogicRules) {
  const preparation = prepareFormSubmission(answers, form, conditionalLogicRules)
  const allFields = form?.sections?.flatMap((sec) => sec.fields) || []

  const hiddenFields = allFields.filter((f) => preparation.fieldStates[f.field_key]?.is_hidden)
  const disabledFields = allFields.filter((f) => preparation.fieldStates[f.field_key]?.is_disabled)
  const requiredFields = preparation.visibleFields.filter(
    (f) => preparation.fieldStates[f.field_key]?.is_required
  )

  const answeredFields = preparation.visibleFields.filter((f) => {
    const value = answers[f.field_key]
    return value !== null && value !== undefined && value !== '' && (Array.isArray(value) ? value.length > 0 : true)
  })

  return {
    totalFields: allFields.length,
    visibleFields: preparation.visibleFields.length,
    hiddenFields: hiddenFields.length,
    disabledFields: disabledFields.length,
    requiredFields: requiredFields.length,
    answeredFields: answeredFields.length,
    completionPercentage:
      requiredFields.length > 0 ? Math.round((answeredFields.length / requiredFields.length) * 100) : 0,
    hasErrors: !preparation.isValid,
    errorCount: Object.keys(preparation.validationErrors).length,
  }
}
