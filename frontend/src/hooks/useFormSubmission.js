/**
 * useFormSubmission - React hook for handling form submission with validation
 */
import { useState } from 'react'
import {
  validateAndSubmitForm,
  formatValidationErrorsForDisplay,
  getErrorSummary,
  getSubmissionAnalytics,
} from '../services/formSubmissionService'

export function useFormSubmission(formId, form, conditionalLogicRules = [], apiBaseUrl = '/api/v1') {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)
  const [responseId, setResponseId] = useState(null)
  const [analytics, setAnalytics] = useState(null)

  const submit = async (answers, metadata = {}) => {
    setIsSubmitting(true)
    setValidationErrors({})
    setSubmitError(null)
    setSubmitSuccess(null)
    setResponseId(null)

    try {
      // Get analytics before submission
      const submissionAnalytics = getSubmissionAnalytics(answers, form, conditionalLogicRules)
      setAnalytics(submissionAnalytics)

      const result = await validateAndSubmitForm(
        formId,
        answers,
        form,
        conditionalLogicRules,
        metadata,
        apiBaseUrl
      )

      if (result.success) {
        setSubmitSuccess(result.message)
        setResponseId(result.responseId)
        setIsSubmitting(false)
        return {
          success: true,
          responseId: result.responseId,
          message: result.message,
        }
      } else if (result.stage === 'client_validation') {
        // Client-side validation errors
        const formatted = formatValidationErrorsForDisplay(result.validationErrors)
        setValidationErrors(formatted)
        setSubmitError(result.message)
        setIsSubmitting(false)

        return {
          success: false,
          validationErrors: formatted,
          message: result.message,
          stage: 'client_validation',
        }
      } else {
        // Server validation or submission errors
        if (result.validationErrors) {
          const formatted = formatValidationErrorsForDisplay(result.validationErrors)
          setValidationErrors(formatted)
        }

        setSubmitError(result.message || result.error)
        setIsSubmitting(false)

        return {
          success: false,
          validationErrors: result.validationErrors || {},
          message: result.message || result.error,
          stage: result.stage || 'submission',
        }
      }
    } catch (error) {
      const errorMessage = error.message || 'An unexpected error occurred'
      setSubmitError(errorMessage)
      setIsSubmitting(false)

      return {
        success: false,
        message: errorMessage,
        error: error,
      }
    }
  }

  const reset = () => {
    setValidationErrors({})
    setSubmitError(null)
    setSubmitSuccess(null)
    setResponseId(null)
    setAnalytics(null)
  }

  const errorSummary = getErrorSummary(validationErrors)

  return {
    submit,
    reset,
    isSubmitting,
    validationErrors,
    submitError,
    submitSuccess,
    responseId,
    analytics,
    errorSummary,
    hasErrors: Object.keys(validationErrors).length > 0,
  }
}
