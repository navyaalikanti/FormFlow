/**
 * ConditionalLogicPanel – Form-Level tab for configuring conditional logic rules
 */
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { builderService } from '../../services/builderService'

const selectCls =
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'

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

const ALL_OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'greater_than', label: 'is greater than' },
  { value: 'less_than', label: 'is less than' },
  { value: 'greater_or_equal', label: 'is greater than or equal to' },
  { value: 'less_or_equal', label: 'is less than or equal to' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
  { value: 'in', label: 'is in' },
  { value: 'not_in', label: 'is not in' },
  { value: 'any_of', label: 'any of' },
  { value: 'all_of', label: 'all of' },
]

const getOperatorsForFieldType = (type) => {
  const common = ['is_empty', 'is_not_empty']
  if (['number'].includes(type)) {
    return ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', ...common]
  }
  if (['date', 'time'].includes(type)) {
    return ['equals', 'not_equals', 'greater_than', 'less_than', ...common]
  }
  if (['dropdown', 'radio', 'checkbox'].includes(type)) {
    return ['equals', 'not_equals', 'in', 'not_in', ...common]
  }
  // Default for text, email, phone, etc.
  return ['equals', 'not_equals', 'contains', 'not_contains', ...common]
}

const ACTION_TYPES = [
  { value: 'show', label: 'Show field', color: 'emerald' },
  { value: 'hide', label: 'Hide field', color: 'rose' },
  { value: 'enable', label: 'Enable field', color: 'blue' },
  { value: 'disable', label: 'Disable field', color: 'amber' },
  { value: 'require', label: 'Make required', color: 'violet' },
  { value: 'optional', label: 'Make optional', color: 'slate' },
]

function RuleEditor({ rule, ruleNumber, allFields, onUpdate, onRemove, ruleSaving, isReadOnly }) {
  const [editedRule, setEditedRule] = useState(rule)

  const sourceField = allFields.find((f) => f.field_key === editedRule.source_field_key)
  const targetField = allFields.find((f) => f.field_key === editedRule.action_config?.target_field_key)

  const operatorConfig = ALL_OPERATORS.find((op) => op.value === editedRule.operator)
  const actionConfig = ACTION_TYPES.find((act) => act.value === editedRule.action_type)

  const handleFieldChange = (updates) => {
    const newRule = { ...editedRule, ...updates }
    setEditedRule(newRule)
    onUpdate(rule, newRule)
  }

  const sourceFieldHasOptions = sourceField && ['dropdown', 'radio', 'checkbox'].includes(sourceField.field_type)
  const sourceFieldOptions = sourceFieldHasOptions ? (sourceField?.options || []) : []

  const allowedOperators = sourceField
    ? getOperatorsForFieldType(sourceField.field_type).map(opVal => ALL_OPERATORS.find(o => o.value === opVal))
    : ALL_OPERATORS

  const disabled = ruleSaving || isReadOnly

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      {/* Rule header & summary */}
      <div className="mb-4 flex items-start justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600 ring-1 ring-inset ring-orange-500/10 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-400/20">
              Rule #{ruleNumber}
            </span>
            <span className={`h-2 w-2 rounded-full ${editedRule.is_active !== false ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
          </div>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {sourceField?.label || editedRule.source_field_key || 'Select field'} <span className="font-normal text-slate-500">{operatorConfig?.label || editedRule.operator}</span>{' '}
            {editedRule.comparison_value && <span className="font-mono text-[11px] text-orange-600 dark:text-orange-400">"{String(editedRule.comparison_value)}"</span>}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Then <span className="font-semibold text-slate-800 dark:text-slate-200">{actionConfig?.label?.toLowerCase() || editedRule.action_type}</span>{' '}
            <span className="font-semibold text-orange-600 dark:text-orange-400">{targetField?.label || editedRule.action_config?.target_field_key || 'Select field'}</span>
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => onRemove(editedRule)}
            disabled={disabled}
            title="Remove rule"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Rule form controls */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" style={{ pointerEvents: disabled ? 'none' : 'auto', opacity: disabled ? 0.7 : 1 }}>
        {/* If field */}
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">If field</label>
          <select
            disabled={disabled}
            className={selectCls}
            value={editedRule.source_field_key || ''}
            onChange={(e) => {
              const newSourceKey = e.target.value;
              const newSourceField = allFields.find(f => f.field_key === newSourceKey);
              let newOperator = editedRule.operator;
              if (newSourceField) {
                const validOps = getOperatorsForFieldType(newSourceField.field_type);
                if (!validOps.includes(newOperator)) {
                  newOperator = validOps[0]; // fallback
                }
              }
              handleFieldChange({ source_field_key: newSourceKey, operator: newOperator })
            }}
          >
            <option value="">Select field</option>
            {allFields.map((f) => (
              <option key={f.field_key} value={f.field_key}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Operator */}
        <div className={['is_empty', 'is_not_empty'].includes(editedRule.operator) ? 'sm:col-span-2' : 'sm:col-span-1'}>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Operator</label>
          <select
            disabled={disabled}
            className={selectCls}
            value={editedRule.operator || ''}
            onChange={(e) => handleFieldChange({ operator: e.target.value })}
          >
            <option value="">Select operator</option>
            {allowedOperators.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>

        {/* Comparison value */}
        {!['is_empty', 'is_not_empty'].includes(editedRule.operator) && (
          <div className="sm:col-span-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Value</label>
            {sourceFieldHasOptions ? (
              <select
                disabled={disabled}
                className={selectCls}
                value={editedRule.comparison_value || ''}
                onChange={(e) => handleFieldChange({ comparison_value: e.target.value })}
              >
                <option value="">Select value</option>
                {sourceFieldOptions.map((opt) => (
                  <option key={opt.option_value} value={opt.option_value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={sourceField?.field_type === 'number' ? 'number' : sourceField?.field_type === 'date' ? 'date' : sourceField?.field_type === 'time' ? 'time' : 'text'}
                disabled={disabled}
                className={selectCls}
                value={typeof editedRule.comparison_value === 'object' ? JSON.stringify(editedRule.comparison_value) : editedRule.comparison_value || ''}
                placeholder="Comparison value"
                onChange={(e) => {
                  if (sourceField?.field_type === 'number') {
                    handleFieldChange({ comparison_value: Number(e.target.value) })
                  } else {
                    try {
                      // Attempt to parse objects/arrays if typing JSON (for advanced rules)
                      const val = JSON.parse(e.target.value)
                      handleFieldChange({ comparison_value: val })
                    } catch {
                      handleFieldChange({ comparison_value: e.target.value })
                    }
                  }
                }}
              />
            )}
          </div>
        )}

        {/* Then action */}
        <div className="sm:col-span-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Then action</label>
          <select
            disabled={disabled}
            className={selectCls}
            value={editedRule.action_type || ''}
            onChange={(e) => handleFieldChange({ action_type: e.target.value })}
          >
            <option value="">Select action</option>
            {ACTION_TYPES.map((act) => (
              <option key={act.value} value={act.value}>
                {act.label}
              </option>
            ))}
          </select>
        </div>

        {/* Target field */}
        <div className="sm:col-span-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Target field</label>
          <select
            disabled={disabled}
            className={selectCls}
            value={editedRule.action_config?.target_field_key || ''}
            onChange={(e) =>
              handleFieldChange({
                action_config: { ...editedRule.action_config, target_field_key: e.target.value },
              })
            }
          >
            <option value="">Select field</option>
            {allFields.map((f) => (
              <option key={f.field_key} value={f.field_key}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority & Active toggle Row */}
        <div className="sm:col-span-2 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Priority</span>
            <input
              type="number"
              disabled={disabled}
              className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              value={editedRule.priority || 0}
              onChange={(e) => handleFieldChange({ priority: Number(e.target.value) })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Toggle
              value={editedRule.is_active !== false}
              onChange={(v) => handleFieldChange({ is_active: v })}
            />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Active</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ConditionalLogicPanel({
  allFields,
  conditionalLogicRules = [],
  formId,
  isReadOnly,
  onRulesChanged,
}) {
  const [rulesSaving, setRulesSaving] = useState(false)

  const handleAddRule = async () => {
    if (!formId || !allFields.length) return
    
    const sourceField = allFields[0]
    const targetField = allFields.length > 1 ? allFields[1] : allFields[0]
    
    const newRule = {
      source_field_key: sourceField.field_key,
      operator: getOperatorsForFieldType(sourceField.field_type)[0],
      comparison_value: '',
      action_type: 'show',
      action_config: { target_field_key: targetField.field_key },
      priority: conditionalLogicRules.length + 1,
      is_active: true,
      trigger_event: 'change',
    }
    
    setRulesSaving(true)
    try {
      await builderService.createConditionalLogicRule(formId, newRule)
      const freshRules = await builderService.getConditionalLogicRules(formId)
      onRulesChanged(freshRules || [])
    } catch (err) {
      console.error('Failed to add rule:', err)
    } finally {
      setRulesSaving(false)
    }
  }

  const handleUpdateRule = async (oldRule, updatedRule) => {
    if (!formId || !oldRule.id) return
    setRulesSaving(true)
    try {
      await builderService.updateConditionalLogicRule(formId, oldRule.id, updatedRule)
      const freshRules = await builderService.getConditionalLogicRules(formId)
      onRulesChanged(freshRules || [])
    } catch (err) {
      console.error('Failed to update rule:', err)
    } finally {
      setRulesSaving(false)
    }
  }

  const handleRemoveRule = async (rule) => {
    if (!formId || !rule.id) return
    setRulesSaving(true)
    try {
      await builderService.deleteConditionalLogicRule(formId, rule.id)
      const freshRules = await builderService.getConditionalLogicRules(formId)
      onRulesChanged(freshRules || [])
    } catch (err) {
      console.error('Failed to delete rule:', err)
    } finally {
      setRulesSaving(false)
    }
  }

  // Sort rules by priority
  const sortedRules = [...conditionalLogicRules].sort((a, b) => (a.priority || 0) - (b.priority || 0))

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* Info status */}
      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/60 dark:bg-slate-900/30">
        <p className="text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
          Form-Level Conditional Logic allows you to create dynamic rules that show, hide, enable, or disable fields based on other field values.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-sans">
            Configured Rules ({sortedRules.length})
          </h3>
          {!isReadOnly && (
            <button
              onClick={handleAddRule}
              disabled={rulesSaving}
              className="flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-100 transition active:scale-95 disabled:opacity-50 dark:bg-orange-950/20 dark:text-orange-400 dark:hover:bg-orange-950/30"
            >
              <Plus size={13} />
              Add Rule
            </button>
          )}
        </div>

        {sortedRules.length > 0 ? (
          <div className="space-y-3.5 font-sans pb-4">
            {sortedRules.map((rule, idx) => (
              <RuleEditor
                key={rule.id}
                rule={rule}
                ruleNumber={idx + 1}
                allFields={allFields}
                onUpdate={handleUpdateRule}
                onRemove={handleRemoveRule}
                ruleSaving={rulesSaving}
                isReadOnly={isReadOnly}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-normal">
              No rules configured yet. Click "Add Rule" to define conditional behavior.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
