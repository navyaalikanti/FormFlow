/**
 * ValidationRulesPanel – Tab for configuring field-level validation rules.
 * Supports a `readOnly` prop for non-editable inspection mode.
 */
import { ChevronDown, Plus, Trash2 } from 'lucide-react'

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'

const readOnlyInputCls =
  'w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700 select-text cursor-default dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200'

function LabeledInput({ label, id, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export default function ValidationRulesPanel({ field, validationRules, onUpdate, readOnly }) {
  const fieldType = field?.field_type
  const ic = readOnly ? readOnlyInputCls : inputCls

  if (!fieldType) {
    return <div className="p-4 text-sm text-slate-500">Select a field to configure validation rules</div>
  }

  // Helper function to update a validation rule
  const updateRule = (ruleName, value) => {
    if (readOnly) return
    onUpdate({
      ...validationRules,
      [ruleName]: value,
    })
  }

  // Helper function to remove a validation rule
  const removeRule = (ruleName) => {
    if (readOnly) return
    const updated = { ...validationRules }
    delete updated[ruleName]
    onUpdate(updated)
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-4 p-4">
      {/* Short Text Validation */}
      {(fieldType === 'short_text' || fieldType === 'text') && (
        <>
          <LabeledInput label="Minimum Length" id="val-min-length" hint="Minimum number of characters">
            <input
              id="val-min-length"
              type="number"
              min="0"
              className={ic}
              value={validationRules?.min_length || ''}
              placeholder="No minimum"
              readOnly={readOnly}
              onChange={(e) => updateRule('min_length', e.target.value ? Number(e.target.value) : null)}
            />
          </LabeledInput>

          <LabeledInput label="Maximum Length" id="val-max-length" hint="Maximum number of characters">
            <input
              id="val-max-length"
              type="number"
              min="1"
              className={ic}
              value={validationRules?.max_length || ''}
              placeholder="No maximum"
              readOnly={readOnly}
              onChange={(e) => updateRule('max_length', e.target.value ? Number(e.target.value) : null)}
            />
          </LabeledInput>

          <LabeledInput label="Custom Min Length Message" id="val-min-msg">
            <input
              id="val-min-msg"
              className={ic}
              value={validationRules?.min_length_message || ''}
              placeholder="e.g., Too short"
              readOnly={readOnly}
              onChange={(e) => updateRule('min_length_message', e.target.value || null)}
            />
          </LabeledInput>

          <LabeledInput label="Custom Max Length Message" id="val-max-msg">
            <input
              id="val-max-msg"
              className={ic}
              value={validationRules?.max_length_message || ''}
              placeholder="e.g., Too long"
              readOnly={readOnly}
              onChange={(e) => updateRule('max_length_message', e.target.value || null)}
            />
          </LabeledInput>
        </>
      )}

      {/* Paragraph Validation */}
      {fieldType === 'paragraph' && (
        <>
          <LabeledInput label="Minimum Length" id="val-min-length" hint="Minimum number of characters">
            <input
              id="val-min-length"
              type="number"
              min="0"
              className={ic}
              value={validationRules?.min_length || ''}
              placeholder="No minimum"
              readOnly={readOnly}
              onChange={(e) => updateRule('min_length', e.target.value ? Number(e.target.value) : null)}
            />
          </LabeledInput>

          <LabeledInput label="Maximum Length" id="val-max-length" hint="Maximum number of characters">
            <input
              id="val-max-length"
              type="number"
              min="1"
              className={ic}
              value={validationRules?.max_length || ''}
              placeholder="No maximum"
              readOnly={readOnly}
              onChange={(e) => updateRule('max_length', e.target.value ? Number(e.target.value) : null)}
            />
          </LabeledInput>

          <LabeledInput label="Custom Min Length Message" id="val-min-msg">
            <input
              id="val-min-msg"
              className={ic}
              value={validationRules?.min_length_message || ''}
              placeholder="e.g., Too short"
              readOnly={readOnly}
              onChange={(e) => updateRule('min_length_message', e.target.value || null)}
            />
          </LabeledInput>

          <LabeledInput label="Custom Max Length Message" id="val-max-msg">
            <input
              id="val-max-msg"
              className={ic}
              value={validationRules?.max_length_message || ''}
              placeholder="e.g., Too long"
              readOnly={readOnly}
              onChange={(e) => updateRule('max_length_message', e.target.value || null)}
            />
          </LabeledInput>
        </>
      )}

      {/* Number Validation */}
      {fieldType === 'number' && (
        <>
          <LabeledInput label="Minimum Value" id="val-min-value">
            <input
              id="val-min-value"
              type="number"
              className={ic}
              value={validationRules?.min_value !== undefined ? validationRules.min_value : ''}
              placeholder="No minimum"
              readOnly={readOnly}
              onChange={(e) => updateRule('min_value', e.target.value ? Number(e.target.value) : null)}
            />
          </LabeledInput>

          <LabeledInput label="Maximum Value" id="val-max-value">
            <input
              id="val-max-value"
              type="number"
              className={ic}
              value={validationRules?.max_value !== undefined ? validationRules.max_value : ''}
              placeholder="No maximum"
              readOnly={readOnly}
              onChange={(e) => updateRule('max_value', e.target.value ? Number(e.target.value) : null)}
            />
          </LabeledInput>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!validationRules?.integer_only}
                disabled={readOnly}
                onChange={(e) => updateRule('integer_only', e.target.checked || null)}
                className="rounded border-slate-300"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300">Integer only</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!validationRules?.positive_only}
                disabled={readOnly}
                onChange={(e) => updateRule('positive_only', e.target.checked || null)}
                className="rounded border-slate-300"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300">Positive only</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!validationRules?.negative_only}
                disabled={readOnly}
                onChange={(e) => updateRule('negative_only', e.target.checked || null)}
                className="rounded border-slate-300"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300">Negative only</span>
            </label>
          </div>

          <LabeledInput label="Step Value" id="val-step" hint="Value increment (e.g., 5 for multiples of 5)">
            <input
              id="val-step"
              type="number"
              step="0.1"
              min="0"
              className={ic}
              value={validationRules?.step || ''}
              placeholder="Any value"
              readOnly={readOnly}
              onChange={(e) => updateRule('step', e.target.value ? Number(e.target.value) : null)}
            />
          </LabeledInput>

          <LabeledInput label="Custom Min Value Message" id="val-min-msg">
            <input
              id="val-min-msg"
              className={ic}
              value={validationRules?.min_value_message || ''}
              readOnly={readOnly}
              onChange={(e) => updateRule('min_value_message', e.target.value || null)}
            />
          </LabeledInput>

          <LabeledInput label="Custom Max Value Message" id="val-max-msg">
            <input
              id="val-max-msg"
              className={ic}
              value={validationRules?.max_value_message || ''}
              readOnly={readOnly}
              onChange={(e) => updateRule('max_value_message', e.target.value || null)}
            />
          </LabeledInput>
        </>
      )}

      {/* Date Validation */}
      {fieldType === 'date' && (
        <>
          <LabeledInput label="Minimum Date" id="val-min-date">
            <input
              id="val-min-date"
              type="date"
              className={ic}
              value={validationRules?.min_date || ''}
              readOnly={readOnly}
              onChange={(e) => updateRule('min_date', e.target.value || null)}
            />
          </LabeledInput>

          <LabeledInput label="Maximum Date" id="val-max-date">
            <input
              id="val-max-date"
              type="date"
              className={ic}
              value={validationRules?.max_date || ''}
              readOnly={readOnly}
              onChange={(e) => updateRule('max_date', e.target.value || null)}
            />
          </LabeledInput>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!validationRules?.disable_past_dates}
                disabled={readOnly}
                onChange={(e) => updateRule('disable_past_dates', e.target.checked || null)}
                className="rounded border-slate-300"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300">Disable past dates</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!validationRules?.disable_future_dates}
                disabled={readOnly}
                onChange={(e) => updateRule('disable_future_dates', e.target.checked || null)}
                className="rounded border-slate-300"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300">Disable future dates</span>
            </label>
          </div>

          <LabeledInput label="Custom Min Date Message" id="val-min-msg">
            <input
              id="val-min-msg"
              className={ic}
              value={validationRules?.min_date_message || ''}
              readOnly={readOnly}
              onChange={(e) => updateRule('min_date_message', e.target.value || null)}
            />
          </LabeledInput>

          <LabeledInput label="Custom Max Date Message" id="val-max-msg">
            <input
              id="val-max-msg"
              className={ic}
              value={validationRules?.max_date_message || ''}
              readOnly={readOnly}
              onChange={(e) => updateRule('max_date_message', e.target.value || null)}
            />
          </LabeledInput>
        </>
      )}

      {/* Time Validation */}
      {fieldType === 'time' && (
        <>
          <LabeledInput label="Minimum Time" id="val-min-time">
            <input
              id="val-min-time"
              type="time"
              className={ic}
              value={validationRules?.min_time || ''}
              readOnly={readOnly}
              onChange={(e) => updateRule('min_time', e.target.value || null)}
            />
          </LabeledInput>

          <LabeledInput label="Maximum Time" id="val-max-time">
            <input
              id="val-max-time"
              type="time"
              className={ic}
              value={validationRules?.max_time || ''}
              readOnly={readOnly}
              onChange={(e) => updateRule('max_time', e.target.value || null)}
            />
          </LabeledInput>

          <LabeledInput label="Custom Min Time Message" id="val-min-msg">
            <input
              id="val-min-msg"
              className={ic}
              value={validationRules?.min_time_message || ''}
              readOnly={readOnly}
              onChange={(e) => updateRule('min_time_message', e.target.value || null)}
            />
          </LabeledInput>

          <LabeledInput label="Custom Max Time Message" id="val-max-msg">
            <input
              id="val-max-msg"
              className={ic}
              value={validationRules?.max_time_message || ''}
              readOnly={readOnly}
              onChange={(e) => updateRule('max_time_message', e.target.value || null)}
            />
          </LabeledInput>
        </>
      )}

      {/* File Upload Validation */}
      {fieldType === 'file' && (
        <>
          <LabeledInput label="Maximum File Size (MB)" id="val-max-size">
            <input
              id="val-max-size"
              type="number"
              min="0.1"
              step="0.1"
              className={ic}
              value={validationRules?.max_file_size_mb || ''}
              placeholder="No limit"
              readOnly={readOnly}
              onChange={(e) => updateRule('max_file_size_mb', e.target.value ? Number(e.target.value) : null)}
            />
          </LabeledInput>

          <LabeledInput label="Maximum File Count" id="val-max-count">
            <input
              id="val-max-count"
              type="number"
              min="1"
              className={ic}
              value={validationRules?.max_file_count || ''}
              placeholder="No limit"
              readOnly={readOnly}
              onChange={(e) => updateRule('max_file_count', e.target.value ? Number(e.target.value) : null)}
            />
          </LabeledInput>

          <LabeledInput
            label="Allowed Extensions"
            id="val-extensions"
            hint="Comma-separated, e.g., pdf,doc,docx"
          >
            <input
              id="val-extensions"
              className={ic}
              value={(validationRules?.allowed_extensions || []).join(',')}
              placeholder="All files allowed"
              readOnly={readOnly}
              onChange={(e) =>
                updateRule(
                  'allowed_extensions',
                  e.target.value
                    ? e.target.value.split(',').map((s) => s.trim().toLowerCase())
                    : null
                )
              }
            />
          </LabeledInput>

          <LabeledInput
            label="Allowed MIME Types"
            id="val-mime-types"
            hint="e.g., image/*,application/pdf"
          >
            <input
              id="val-mime-types"
              className={ic}
              value={(validationRules?.allowed_file_types || []).join(',')}
              placeholder="All files allowed"
              readOnly={readOnly}
              onChange={(e) =>
                updateRule(
                  'allowed_file_types',
                  e.target.value
                    ? e.target.value.split(',').map((s) => s.trim())
                    : null
                )
              }
            />
          </LabeledInput>

          <LabeledInput label="Custom Max Size Message" id="val-size-msg">
            <input
              id="val-size-msg"
              className={ic}
              value={validationRules?.max_size_message || ''}
              readOnly={readOnly}
              onChange={(e) => updateRule('max_size_message', e.target.value || null)}
            />
          </LabeledInput>

          <LabeledInput label="Custom Max Count Message" id="val-count-msg">
            <input
              id="val-count-msg"
              className={ic}
              value={validationRules?.max_count_message || ''}
              readOnly={readOnly}
              onChange={(e) => updateRule('max_count_message', e.target.value || null)}
            />
          </LabeledInput>
        </>
      )}

      {/* Email Validation */}
      {fieldType === 'email' && (
        <LabeledInput label="Custom Error Message" id="val-email-msg">
          <input
            id="val-email-msg"
            className={ic}
            value={validationRules?.email_message || ''}
            placeholder="Invalid email address"
            readOnly={readOnly}
            onChange={(e) => updateRule('email_message', e.target.value || null)}
          />
        </LabeledInput>
      )}

      {/* Phone Validation */}
      {fieldType === 'phone' && (
        <LabeledInput label="Custom Error Message" id="val-phone-msg">
          <input
            id="val-phone-msg"
            className={ic}
            value={validationRules?.phone_message || ''}
            placeholder="Invalid phone number"
            readOnly={readOnly}
            onChange={(e) => updateRule('phone_message', e.target.value || null)}
          />
        </LabeledInput>
      )}

      {/* URL Validation */}
      {fieldType === 'url' && (
        <LabeledInput label="Custom Error Message" id="val-url-msg">
          <input
            id="val-url-msg"
            className={ic}
            value={validationRules?.url_message || ''}
            placeholder="Invalid URL"
            readOnly={readOnly}
            onChange={(e) => updateRule('url_message', e.target.value || null)}
          />
        </LabeledInput>
      )}

      {/* Default message */}
      {!['short_text', 'paragraph', 'number', 'date', 'time', 'file', 'email', 'phone', 'url'].includes(
        fieldType
      ) && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No validation rules available for {fieldType} fields
          </p>
        </div>
      )}
    </div>
  )
}
