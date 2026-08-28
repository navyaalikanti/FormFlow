/**
 * ValidationPreview – Interactive preview of field validation in Property Panel
 */
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { validateField } from '../../utils/validation'
import ValidationFeedback from './ValidationFeedback'

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'

export default function ValidationPreview({ field, validationRules, isRequired }) {
  const [showPreview, setShowPreview] = useState(false)
  const [testValue, setTestValue] = useState('')
  const [errors, setErrors] = useState([])

  const handleTestValueChange = (value) => {
    setTestValue(value)

    // Run validation
    const validationErrors = validateField(value, field?.field_type, validationRules)
    setErrors(validationErrors)
  }

  if (!field) {
    return null
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
      {/* Toggle preview */}
      <button
        onClick={() => setShowPreview(!showPreview)}
        className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        {showPreview ? <Eye size={14} /> : <EyeOff size={14} />}
        {showPreview ? 'Hide' : 'Show'} Validation Preview
      </button>

      {showPreview && (
        <div className="space-y-3">
          {/* Test input */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Test Value
            </label>
            <input
              type="text"
              className={inputCls}
              value={testValue}
              placeholder={`Enter test ${field?.field_type} value...`}
              onChange={(e) => handleTestValueChange(e.target.value)}
            />
          </div>

          {/* Validation feedback */}
          {testValue && (
            <ValidationFeedback
              fieldValue={testValue}
              fieldType={field?.field_type}
              validationRules={validationRules}
              isRequired={isRequired}
              validateFunction={(value, rules) => validateField(value, field?.field_type, rules)}
            />
          )}

          {/* Error display */}
          {errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 dark:border-red-800 dark:bg-red-900/20">
              <p className="mb-2 text-xs font-semibold text-red-700 dark:text-red-300">Validation Errors:</p>
              <ul className="space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx} className="text-xs text-red-600 dark:text-red-400">
                    • {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Success state */}
          {testValue && errors.length === 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-2 dark:border-green-800 dark:bg-green-900/20">
              <p className="text-xs font-semibold text-green-700 dark:text-green-300">✓ Validation passed!</p>
            </div>
          )}

          {/* Rules summary */}
          {Object.keys(validationRules || {}).length > 0 && (
            <div className="rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-600 dark:bg-slate-900/50">
              <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">Active Rules:</p>
              <ul className="space-y-1">
                {Object.entries(validationRules).map(([key, value]) => {
                  if (value === null || value === undefined || value === '') {
                    return null
                  }

                  let label = key
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (char) => char.toUpperCase())

                  return (
                    <li key={key} className="text-xs text-slate-600 dark:text-slate-400">
                      • {label}: {JSON.stringify(value)}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
