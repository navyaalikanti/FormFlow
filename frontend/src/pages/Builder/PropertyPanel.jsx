/**
 * PropertyPanel – right sidebar showing editable properties for the selected field.
 * Includes tabs for General, Validation, and Conditional Logic configuration.
 */
import { useEffect, useState } from 'react'
import { ChevronDown, Plus, Trash2, X } from 'lucide-react'
import { OPTION_FIELD_TYPES } from './fieldConstants'
import ValidationRulesPanel from './ValidationRulesPanel'
import ConditionalLogicPanel from './ConditionalLogicPanel'

function LabeledInput({ label, id, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'

const toggleCls = (active) =>
  `relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
    active ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'
  }`

function Toggle({ value, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={value} className={toggleCls(value)} onClick={() => onChange(!value)}>
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          value ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function PropertyPanel({ field, onUpdate, onClose, allFields = [], conditionalLogicRules = [] }) {
  const [form, setForm] = useState(field ? JSON.parse(JSON.stringify(field)) : {})
  const [activeTab, setActiveTab] = useState('general')

  // Sync form state only when a different field is selected (ID changes)
  // Do NOT sync on every [field] change, as field object reference can change without data changing
  useEffect(() => {
    if (!field) {
      setForm({})
    } else if (form.id !== field.id) {
      // Different field selected - sync to the new field
      setForm(JSON.parse(JSON.stringify(field)))
      setActiveTab('general')
    }
    // If same field ID, preserve local edits - don't reset form
  }, [field?.id])

  // Guard: if field or form is null/empty, show empty state
  if (!field || !form) {
    return (
      <aside className="flex w-72 flex-shrink-0 flex-col items-center justify-center border-l border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          <ChevronDown size={20} className="text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Select a field to edit its properties</p>
      </aside>
    )
  }

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const updateOption = (idx, updates) => {
    setForm((prev) => {
      const opts = [...(prev.options || [])]
      opts[idx] = { ...opts[idx], ...updates }
      return { ...prev, options: opts }
    })
  }
  

  const addOption = () => {
    const opts = [...(form.options || [])]
    opts.push({ label: `Option ${opts.length + 1}`, option_value: `option_${opts.length + 1}`, sort_order: opts.length, is_default: false, option_config: {} })
    setForm((prev) => ({ ...prev, options: opts }))
  }

  const removeOption = (idx) => {
    const opts = (form.options || []).filter((_, i) => i !== idx)
    setForm((prev) => ({ ...prev, options: opts }))
  }

  const handleSave = () => {
    onUpdate(form)
  }

  const showOptions = OPTION_FIELD_TYPES.has(form?.field_type)

  return (
    <aside className="flex h-full w-72 flex-shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Field Properties</h2>
          <p className="text-xs text-slate-400 capitalize">{form?.field_type || 'field'}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {/* Label */}
        <LabeledInput label="Label" id="prop-label">
          <input
            id="prop-label"
            className={inputCls}
            value={form?.label || ''}
            onChange={(e) => update('label', e.target.value)}
          />
        </LabeledInput>

        {/* Placeholder – not for section / checkbox / radio / date / time / rating / file */}
        {!['section', 'checkbox', 'radio', 'date', 'time', 'rating', 'file'].includes(form?.field_type) && (
          <LabeledInput label="Placeholder" id="prop-placeholder">
            <input
              id="prop-placeholder"
              className={inputCls}
              value={form?.placeholder || ''}
              onChange={(e) => update('placeholder', e.target.value)}
            />
          </LabeledInput>
        )}

        {/* Helper text */}
        <LabeledInput label="Helper Text" id="prop-helper">
          <input
            id="prop-helper"
            className={inputCls}
            value={form?.helper_text || ''}
            onChange={(e) => update('helper_text', e.target.value)}
          />
        </LabeledInput>

        {/* Description */}
        <LabeledInput label="Description" id="prop-desc">
          <textarea
            id="prop-desc"
            rows={2}
            className={`${inputCls} resize-none`}
            value={form?.description || ''}
            onChange={(e) => update('description', e.target.value)}
          />
        </LabeledInput>

        {/* Rating stars */}
        {form?.field_type === 'rating' && (
          <LabeledInput label="Max Stars" id="prop-stars">
            <select
              id="prop-stars"
              className={inputCls}
              value={(form?.config || {}).max_stars || 5}
              onChange={(e) => update('config', { ...(form?.config || {}), max_stars: Number(e.target.value) })}
            >
              {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>{n} stars</option>
              ))}
            </select>
          </LabeledInput>
        )}

        {/* Paragraph rows */}
        {form?.field_type === 'paragraph' && (
          <LabeledInput label="Rows" id="prop-rows">
            <input
              id="prop-rows"
              type="number"
              min={2}
              max={20}
              className={inputCls}
              value={(form?.config || {}).rows || 4}
              onChange={(e) => update('config', { ...(form?.config || {}), rows: Number(e.target.value) })}
            />
          </LabeledInput>
        )}

        {/* Options for dropdown / radio / checkbox */}
        {showOptions && (
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Options</p>
            <div className="space-y-1.5">
              {(form?.options || []).map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    className={`${inputCls} flex-1 py-1.5 text-xs`}
                    value={opt?.label || ''}
                    placeholder={`Option ${idx + 1}`}
                    onChange={(e) => {
                      const label = e.target.value
                      updateOption(idx, {
                        label,
                        option_value: label.toLowerCase().replace(/\s+/g, '_'),
                      })
                    }}
                  />
                  <button
                    onClick={() => removeOption(idx)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addOption}
              className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-500 hover:border-brand-400 hover:text-brand-500 dark:border-slate-700"
            >
              <Plus size={13} />
              Add option
            </button>
          </div>
        )}

        {/* Toggles */}
        {form?.field_type !== 'section' && (
          <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Validation</p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-300">Required</span>
              <Toggle value={!!form?.is_required} onChange={(v) => update('is_required', v)} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-300">Hidden</span>
              <Toggle value={!!form?.is_hidden} onChange={(v) => update('is_hidden', v)} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-300">Read only</span>
              <Toggle value={!!form?.is_read_only} onChange={(v) => update('is_read_only', v)} />
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <button
          onClick={handleSave}
          className="w-full rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 active:scale-95"
        >
          Save Changes
        </button>
      </div>
    </aside>
  )
}
