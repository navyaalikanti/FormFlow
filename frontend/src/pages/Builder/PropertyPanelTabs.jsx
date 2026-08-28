/**
 * PropertyPanelTabs – Field properties panel with General and Validation tabs.
 * Supports a `readOnly` mode for inspecting Published/Historical versions
 * without allowing any edits.
 */
import { useEffect, useState } from 'react'
import { ChevronDown, Eye, Plus, Trash2, X } from 'lucide-react'
import { OPTION_FIELD_TYPES } from './fieldConstants'
import ValidationRulesPanel from './ValidationRulesPanel'

// ── shared style helpers ──────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'

const readOnlyInputCls =
  'w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700 select-text cursor-default dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200'

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

// ── Toggle: editable vs display ───────────────────────────────────────────────

const toggleCls = (active) =>
  `relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
    active ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'
  }`

function Toggle({ value, onChange, readOnly }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      className={`${toggleCls(value)} ${readOnly ? 'cursor-default' : 'cursor-pointer focus:outline-none'}`}
      onClick={readOnly ? undefined : () => onChange(!value)}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          value ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// ── Read-only badge ───────────────────────────────────────────────────────────

function ReadOnlyBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      <Eye size={9} />
      Read Only
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PropertyPanelTabs({ field, onUpdate, onClose, allFields = [], disabled, readOnly, formId }) {
  const [form, setForm] = useState(field ? JSON.parse(JSON.stringify(field)) : {})
  const [activeTab, setActiveTab] = useState('general')

  // Treat both explicit readOnly prop and legacy disabled prop as read-only
  const isReadOnly = readOnly || disabled

  useEffect(() => {
    if (!field) {
      setForm({})
    } else if (form.id !== field.id) {
      setForm(JSON.parse(JSON.stringify(field)))
      setActiveTab('general')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field?.id])

  if (!field || !form) {
    return (
      <aside className="flex w-72 flex-shrink-0 flex-col items-center justify-center border-l border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          <ChevronDown size={20} className="text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Select a field to inspect its properties</p>
      </aside>
    )
  }

  const update = (key, value) => {
    if (isReadOnly) return
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateOption = (idx, updates) => {
    if (isReadOnly) return
    setForm((prev) => {
      const opts = [...(prev.options || [])]
      opts[idx] = { ...opts[idx], ...updates }
      return { ...prev, options: opts }
    })
  }

  const addOption = () => {
    if (isReadOnly) return
    const opts = [...(form.options || [])]
    opts.push({ label: `Option ${opts.length + 1}`, option_value: `option_${opts.length + 1}`, sort_order: opts.length, is_default: false, option_config: {} })
    setForm((prev) => ({ ...prev, options: opts }))
  }

  const removeOption = (idx) => {
    if (isReadOnly) return
    const opts = (form.options || []).filter((_, i) => i !== idx)
    setForm((prev) => ({ ...prev, options: opts }))
  }

  const handleSave = () => {
    if (isReadOnly) return
    onUpdate(form)
  }

  const updateValidationRules = (rules) => {
    if (isReadOnly) return
    const updated = { ...form, validation_rules: rules }
    setForm(updated)
    onUpdate(updated)
  }

  const showOptions = OPTION_FIELD_TYPES.has(form?.field_type)

  // ── input class: editable vs read-only ─────────────────────────────────────
  const ic = isReadOnly ? readOnlyInputCls : inputCls

  return (
    <aside className="flex h-full w-96 flex-shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hide-scrollbar">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Field Properties</h2>
            <p className="text-xs text-slate-400 capitalize">{form?.field_type || 'field'}</p>
          </div>
          {isReadOnly && <ReadOnlyBadge />}
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X size={15} />
        </button>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex-1 px-3 py-2.5 text-xs font-semibold transition ${
            activeTab === 'general'
              ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400'
              : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          General
        </button>
        {!['dropdown', 'radio', 'checkbox'].includes(form?.field_type) && (
          <button
            onClick={() => setActiveTab('validation')}
            className={`flex-1 px-3 py-2.5 text-xs font-semibold transition ${
              activeTab === 'validation'
                ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400'
                : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Validation
          </button>
        )}
      </div>

      {/* ── Content Area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">

        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-4 p-4">

            <LabeledInput label="Label" id="prop-label">
              <input
                id="prop-label"
                className={ic}
                value={form?.label || ''}
                readOnly={isReadOnly}
                onChange={(e) => update('label', e.target.value)}
              />
            </LabeledInput>

            {!['section', 'checkbox', 'radio', 'date', 'time', 'rating', 'file'].includes(form?.field_type) && (
              <LabeledInput label="Placeholder" id="prop-placeholder">
                <input
                  id="prop-placeholder"
                  className={ic}
                  value={form?.placeholder || ''}
                  readOnly={isReadOnly}
                  onChange={(e) => update('placeholder', e.target.value)}
                />
              </LabeledInput>
            )}

            <LabeledInput label="Helper Text" id="prop-helper">
              <input
                id="prop-helper"
                className={ic}
                value={form?.helper_text || ''}
                readOnly={isReadOnly}
                onChange={(e) => update('helper_text', e.target.value)}
              />
            </LabeledInput>

            <LabeledInput label="Description" id="prop-desc">
              <textarea
                id="prop-desc"
                rows={2}
                className={`${ic} resize-none`}
                value={form?.description || ''}
                readOnly={isReadOnly}
                onChange={(e) => update('description', e.target.value)}
              />
            </LabeledInput>

            {form?.field_type === 'rating' && (
              <LabeledInput label="Max Stars" id="prop-stars">
                <select
                  id="prop-stars"
                  className={ic}
                  value={(form?.config || {}).max_stars || 5}
                  disabled={isReadOnly}
                  onChange={(e) => update('config', { ...(form?.config || {}), max_stars: Number(e.target.value) })}
                >
                  {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>{n} stars</option>
                  ))}
                </select>
              </LabeledInput>
            )}

            {form?.field_type === 'paragraph' && (
              <LabeledInput label="Rows" id="prop-rows">
                <input
                  id="prop-rows"
                  type="number"
                  min={2}
                  max={20}
                  className={ic}
                  value={(form?.config || {}).rows || 4}
                  readOnly={isReadOnly}
                  onChange={(e) => update('config', { ...(form?.config || {}), rows: Number(e.target.value) })}
                />
              </LabeledInput>
            )}

            {showOptions && (
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Options</p>
                <div className="space-y-1.5">
                  {(form?.options || []).map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        className={`${ic} flex-1 py-1.5 text-xs`}
                        value={opt?.label || ''}
                        placeholder={`Option ${idx + 1}`}
                        readOnly={isReadOnly}
                        onChange={(e) => {
                          const label = e.target.value
                          updateOption(idx, {
                            label,
                            option_value: label.toLowerCase().replace(/\s+/g, '_'),
                          })
                        }}
                      />
                      {!isReadOnly && (
                        <button
                          onClick={() => removeOption(idx)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {!isReadOnly && (
                  <button
                    onClick={addOption}
                    className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-500 hover:border-orange-400 hover:text-orange-500 dark:border-slate-700"
                  >
                    <Plus size={13} />
                    Add option
                  </button>
                )}
              </div>
            )}

            {form?.field_type !== 'section' && (
              <div className={`space-y-3 rounded-xl border p-3 ${
                isReadOnly
                  ? 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/30'
                  : 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50'
              }`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Flags</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-300">Required</span>
                  <Toggle
                    value={!!form?.is_required}
                    onChange={(v) => update('is_required', v)}
                    readOnly={isReadOnly}
                  />
                </div>
              </div>
            )}

          </div>
        )}

        {/* Validation Tab */}
        {activeTab === 'validation' && (
          <ValidationRulesPanel
            field={form}
            validationRules={form?.validation_rules || {}}
            onUpdate={updateValidationRules}
            readOnly={isReadOnly}
          />
        )}

      </div>

      {/* ── Footer: Save button (hidden in read-only) ─────────────────────── */}
      {!isReadOnly && (
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <button
            onClick={handleSave}
            className="w-full rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 active:scale-95"
          >
            Save Changes
          </button>
        </div>
      )}

    </aside>
  )
}
