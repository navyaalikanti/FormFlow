/**
 * ValidationRuleDisplay – Tooltip/popover that shows validation constraints
 * on hover or click of an Info icon beside the field label.
 *
 * Usage:
 *   <ValidationRuleDisplay field={field} validationRules={field.validation_rules} />
 *
 * Place this INSIDE the <label> element or directly beside it.
 * The component renders nothing if there are no applicable rules.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { Info } from 'lucide-react'

// ─── Rule extractor ───────────────────────────────────────────────────────────
function buildRules(field, validationRules) {
  if (!validationRules || Object.keys(validationRules).length === 0) return []

  const fieldType = field?.field_type
  const rules = []

  // Required (passed explicitly from parent state)
  // Not added here – the label already shows the asterisk.

  // Short Text / Text / Paragraph
  if (
    fieldType === 'short_text' ||
    fieldType === 'text' ||
    fieldType === 'paragraph'
  ) {
    if (validationRules.min_length !== undefined && validationRules.min_length !== null) {
      rules.push(validationRules.min_length_message || `Minimum ${validationRules.min_length} characters`)
    }
    if (validationRules.max_length !== undefined && validationRules.max_length !== null) {
      rules.push(validationRules.max_length_message || `Maximum ${validationRules.max_length} characters`)
    }
    if (validationRules.pattern) {
      rules.push(validationRules.pattern_message || 'Must match required pattern')
    }
  }

  // Number
  if (fieldType === 'number') {
    if (validationRules.min_value !== undefined && validationRules.min_value !== null) {
      rules.push(validationRules.min_value_message || `Minimum value: ${validationRules.min_value}`)
    }
    if (validationRules.max_value !== undefined && validationRules.max_value !== null) {
      rules.push(validationRules.max_value_message || `Maximum value: ${validationRules.max_value}`)
    }
    if (validationRules.integer_only) rules.push('Integer values only')
    if (validationRules.positive_only) rules.push('Positive values only')
    if (validationRules.negative_only) rules.push('Negative values only')
    if (validationRules.step) rules.push(`Must be in steps of ${validationRules.step}`)
  }

  // Date
  if (fieldType === 'date') {
    if (validationRules.min_date) {
      rules.push(validationRules.min_date_message || `Earliest date: ${validationRules.min_date}`)
    }
    if (validationRules.max_date) {
      rules.push(validationRules.max_date_message || `Latest date: ${validationRules.max_date}`)
    }
    if (validationRules.disable_past_dates) rules.push('Past dates are not allowed')
    if (validationRules.disable_future_dates) rules.push('Future dates are not allowed')
  }

  // Time
  if (fieldType === 'time') {
    if (validationRules.min_time) {
      rules.push(validationRules.min_time_message || `Earliest time: ${validationRules.min_time}`)
    }
    if (validationRules.max_time) {
      rules.push(validationRules.max_time_message || `Latest time: ${validationRules.max_time}`)
    }
  }

  // Email
  if (fieldType === 'email') {
    rules.push(validationRules.email_message || 'Must be a valid email address')
  }

  // Phone
  if (fieldType === 'phone') {
    rules.push(validationRules.phone_message || 'Must be a valid phone number')
  }

  // URL
  if (fieldType === 'url') {
    rules.push(validationRules.url_message || 'Must be a valid URL')
  }

  // File Upload
  if (fieldType === 'file') {
    if (validationRules.allowed_file_types?.length > 0) {
      rules.push(`Allowed: ${validationRules.allowed_file_types.join(', ').toUpperCase()}`)
    }
    if (validationRules.max_file_size_mb) {
      rules.push(`Maximum file size: ${validationRules.max_file_size_mb} MB`)
    }
    if (validationRules.max_file_count) {
      const n = validationRules.max_file_count
      rules.push(`Maximum ${n} file${n !== 1 ? 's' : ''}`)
    }
  }

  return rules
}

// ─── Tooltip popover ──────────────────────────────────────────────────────────
export default function ValidationRuleDisplay({ field, validationRules }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const hideTimeoutRef = useRef(null)

  const rules = buildRules(field, validationRules)
  if (rules.length === 0) return null

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Keyboard close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const handleMouseEnter = useCallback(() => {
    clearTimeout(hideTimeoutRef.current)
    setOpen(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => setOpen(false), 120)
  }, [])

  const handleClick = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen((prev) => !prev)
  }, [])

  return (
    <span
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Info icon trigger */}
      <button
        type="button"
        aria-label="View validation rules"
        aria-expanded={open}
        onClick={handleClick}
        className="ml-1.5 inline-flex items-center justify-center rounded-full text-slate-400 transition-colors hover:text-orange-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 dark:text-slate-500 dark:hover:text-orange-400"
      >
        <Info size={13} strokeWidth={2} />
      </button>

      {/* Popover */}
      {open && (
        <span
          role="tooltip"
          className={[
            // Positioning
            'absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2',
            // Size
            'w-52',
            // Appearance
            'rounded-xl border border-slate-200 bg-white shadow-lg',
            'dark:border-slate-700 dark:bg-slate-900',
            // Animation
            'animate-tooltip-in',
          ].join(' ')}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Arrow */}
          <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-br-sm border-b border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />

          <div className="px-3.5 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Validation rules
            </p>
            <ul className="space-y-1.5">
              {rules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-[3px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
                  <span className="text-xs leading-snug text-slate-700 dark:text-slate-300">
                    {rule}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </span>
      )}
    </span>
  )
}
