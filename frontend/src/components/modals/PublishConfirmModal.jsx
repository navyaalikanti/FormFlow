/**
 * PublishConfirmModal – Confirmation dialog for publishing a form
 * Extended with optional Response Collection Settings (max responses + deadline).
 * Also includes Response Retention Policy settings.
 */
import { useState } from 'react'
import { AlertCircle, CalendarDays, Clock, Hash, X, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import RetentionPolicySettings from '../forms/RetentionPolicySettings'

// Helper: format a JS Date to datetime-local input value (YYYY-MM-DDTHH:mm) in local time
function toLocalDatetimeInput(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

// Default deadline: tomorrow 11:59 PM local time
function defaultDeadline() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(23, 59, 0, 0)
  return toLocalDatetimeInput(d)
}

export default function PublishConfirmModal({ formTitle, onConfirm, onCancel, loading }) {
  const { t } = useTranslation()

  // Response limit state
  const [limitEnabled, setLimitEnabled] = useState(false)
  const [maxResponses, setMaxResponses] = useState('')

  // Deadline state
  const [deadlineEnabled, setDeadlineEnabled] = useState(false)
  const [deadlineDatetime, setDeadlineDatetime] = useState(defaultDeadline())

  // Retention policy state
  const [retentionEnabled, setRetentionEnabled] = useState(false)
  const [retentionDays, setRetentionDays] = useState(90)

  // Local validation
  const maxResponsesNum = parseInt(maxResponses, 10)
  const limitError = limitEnabled && (isNaN(maxResponsesNum) || maxResponsesNum < 1)
    ? 'Enter a positive number'
    : null

  const deadlineDate = deadlineEnabled ? new Date(deadlineDatetime) : null
  const deadlineError = deadlineEnabled && deadlineDate && deadlineDate <= new Date()
    ? 'Deadline must be in the future'
    : null

  const hasErrors = limitError || deadlineError
  const canPublish = !hasErrors

  const handleConfirm = () => {
    if (!canPublish) return
    const publishOptions = {
      limit_enabled: limitEnabled,
      max_responses: limitEnabled ? maxResponsesNum : null,
      deadline_enabled: deadlineEnabled,
      // Convert local datetime string to UTC ISO string
      deadline_datetime: deadlineEnabled && deadlineDate ? deadlineDate.toISOString() : null,
      retention_enabled: retentionEnabled,
      retention_days: retentionEnabled ? retentionDays : null,
    }
    onConfirm(publishOptions)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 animate-fade-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <AlertCircle size={20} className="text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('modals.publishForm')}</h2>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed dark:hover:bg-slate-800 flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body - Scrollable (hidden scrollbar) */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto min-h-0 flex-1 hide-scrollbar">
          <p className="text-slate-600 dark:text-slate-300">
            {t('modals.publishDescription')}
          </p>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
            <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <strong>"{formTitle}"</strong>
            </p>
            <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
              <li>A version snapshot of the form will be created.</li>
              <li>Existing responses and published versions will remain unaffected.</li>
              <li>You can continue editing by creating a new version later.</li>
            </ul>
          </div>

          {/* ── Response Collection Settings ────────────────────────── */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 flex items-center gap-2">
              <ChevronDown size={14} className="text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Response Collection Settings
              </span>
              <span className="ml-1 rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Optional
              </span>
            </div>

            <div className="px-4 py-4 space-y-4">
              {/* ── Maximum Responses ────────── */}
              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="limit-enabled"
                      className="sr-only peer"
                      checked={limitEnabled}
                      onChange={(e) => setLimitEnabled(e.target.checked)}
                      disabled={loading}
                    />
                    <div className="h-5 w-5 rounded border-2 border-slate-300 bg-white peer-checked:border-orange-500 peer-checked:bg-orange-500 transition-all dark:border-slate-600 dark:bg-slate-800 dark:peer-checked:border-orange-500 dark:peer-checked:bg-orange-500 flex items-center justify-center">
                      {limitEnabled && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash size={14} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Limit maximum responses
                    </span>
                  </div>
                </label>

                {limitEnabled && (
                  <div className="ml-7 space-y-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Maximum Responses
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={maxResponses}
                      onChange={(e) => setMaxResponses(e.target.value)}
                      disabled={loading}
                      placeholder="e.g. 100"
                      className={`w-full rounded-lg border px-3 py-2 text-sm font-medium text-slate-800 outline-none transition dark:bg-slate-800 dark:text-white
                        ${limitError
                          ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/10'
                          : 'border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 dark:border-slate-600'
                        }`}
                    />
                    {limitError && (
                      <p className="text-xs text-red-500 font-medium">{limitError}</p>
                    )}
                    <p className="text-xs text-slate-400">
                      The form will stop accepting responses once this number is reached.
                    </p>
                  </div>
                )}
              </div>

              {/* ── Submission Deadline ─────── */}
              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="deadline-enabled"
                      className="sr-only peer"
                      checked={deadlineEnabled}
                      onChange={(e) => setDeadlineEnabled(e.target.checked)}
                      disabled={loading}
                    />
                    <div className="h-5 w-5 rounded border-2 border-slate-300 bg-white peer-checked:border-orange-500 peer-checked:bg-orange-500 transition-all dark:border-slate-600 dark:bg-slate-800 dark:peer-checked:border-orange-500 dark:peer-checked:bg-orange-500 flex items-center justify-center">
                      {deadlineEnabled && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays size={14} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Enable submission deadline
                    </span>
                  </div>
                </label>

                {deadlineEnabled && (
                  <div className="ml-7 space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <CalendarDays size={11} /> Date &amp; Time
                        </label>
                        <input
                          type="datetime-local"
                          value={deadlineDatetime}
                          onChange={(e) => setDeadlineDatetime(e.target.value)}
                          disabled={loading}
                          className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-800 outline-none transition dark:bg-slate-800 dark:text-white
                            ${deadlineError
                              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/10'
                              : 'border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 dark:border-slate-600'
                            }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <Clock size={11} /> Timezone
                        </label>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                          {Intl.DateTimeFormat().resolvedOptions().timeZone}
                          <p className="text-[10px] text-slate-400 mt-0.5">Stored as UTC</p>
                        </div>
                      </div>
                    </div>
                    {deadlineError && (
                      <p className="text-xs text-red-500 font-medium">{deadlineError}</p>
                    )}
                    <p className="text-xs text-slate-400">
                      The form will stop accepting responses after this date and time (shown in your local timezone).
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Response Retention Policy ────────────────────────── */}
          <RetentionPolicySettings
            enabled={retentionEnabled}
            retentionDays={retentionDays}
            onEnabledChange={setRetentionEnabled}
            onRetentionDaysChange={setRetentionDays}
          />
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800 flex-shrink-0 bg-white dark:bg-slate-900">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !canPublish}
            className="flex-1 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-orange-600 dark:hover:bg-orange-700"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t('modals.publishing')}
              </span>
            ) : (
              t('common.publish')
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
