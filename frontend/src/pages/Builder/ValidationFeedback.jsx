/**
 * ValidationFeedback – Shows real-time validation errors and previews in Property Panel
 */
import { AlertCircle, CheckCircle, Info } from 'lucide-react'

export default function ValidationFeedback({
  fieldValue,
  fieldType,
  validationRules,
  isRequired,
  validateFunction,
}) {
  // Run validation
  const errors = validateFunction ? validateFunction(fieldValue, validationRules) : []
  const isValid = errors.length === 0

  // Build validation preview messages
  const previews = []

  if (isRequired) {
    previews.push({
      type: 'info',
      message: 'This field is required',
      icon: Info,
    })
  }

  if (validationRules?.min_length !== undefined && validationRules.min_length !== null) {
    previews.push({
      type: 'info',
      message: `Minimum ${validationRules.min_length} characters`,
    })
  }

  if (validationRules?.max_length !== undefined && validationRules.max_length !== null) {
    previews.push({
      type: 'info',
      message: `Maximum ${validationRules.max_length} characters`,
    })
  }

  if (validationRules?.min_value !== undefined && validationRules.min_value !== null) {
    previews.push({
      type: 'info',
      message: `Minimum value: ${validationRules.min_value}`,
    })
  }

  if (validationRules?.max_value !== undefined && validationRules.max_value !== null) {
    previews.push({
      type: 'info',
      message: `Maximum value: ${validationRules.max_value}`,
    })
  }

  if (validationRules?.pattern) {
    previews.push({
      type: 'info',
      message: `Pattern: ${validationRules.pattern}`,
    })
  }

  if (validationRules?.integer_only) {
    previews.push({
      type: 'info',
      message: 'Integer only',
    })
  }

  if (validationRules?.positive_only) {
    previews.push({
      type: 'info',
      message: 'Positive values only',
    })
  }

  if (validationRules?.disable_past_dates) {
    previews.push({
      type: 'info',
      message: 'Past dates disabled',
    })
  }

  if (validationRules?.disable_future_dates) {
    previews.push({
      type: 'info',
      message: 'Future dates disabled',
    })
  }

  if (validationRules?.max_file_size_mb) {
    previews.push({
      type: 'info',
      message: `Max file size: ${validationRules.max_file_size_mb}MB`,
    })
  }

  // Add errors if value is provided
  if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
    errors.forEach((error) => {
      previews.push({
        type: 'error',
        message: error.message,
      })
    })
  }

  // Show success if value is provided and valid
  if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '' && isValid && previews.length > 0) {
    previews.unshift({
      type: 'success',
      message: 'Validation rules passed',
      icon: CheckCircle,
    })
  }

  if (previews.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="space-y-2">
        {previews.map((preview, idx) => {
          const bgColor =
            preview.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/20'
              : preview.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-blue-50 dark:bg-blue-900/20'

          const textColor =
            preview.type === 'error'
              ? 'text-red-700 dark:text-red-300'
              : preview.type === 'success'
                ? 'text-green-700 dark:text-green-300'
                : 'text-blue-700 dark:text-blue-300'

          const borderColor =
            preview.type === 'error'
              ? 'border-red-200 dark:border-red-800'
              : preview.type === 'success'
                ? 'border-green-200 dark:border-green-800'
                : 'border-blue-200 dark:border-blue-800'

          const Icon =
            preview.icon ||
            (preview.type === 'error' ? AlertCircle : preview.type === 'success' ? CheckCircle : Info)

          return (
            <div key={idx} className={`flex items-start gap-2 rounded border ${borderColor} ${bgColor} p-2`}>
              <Icon size={14} className={`mt-0.5 flex-shrink-0 ${textColor}`} />
              <p className={`text-xs ${textColor}`}>{preview.message}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
