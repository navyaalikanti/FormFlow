/**
 * RetentionPolicySettings – Component for configuring data retention policies
 * Used in PublishConfirmModal to allow users to set automatic response archival
 */

import { useEffect, useState } from 'react'
import { AlertCircle, Archive, ToggleLeft, ToggleRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function RetentionPolicySettings({
  enabled = false,
  retentionDays = 90,
  onEnabledChange,
  onRetentionDaysChange,
}) {
  const { t } = useTranslation()
  const [localEnabled, setLocalEnabled] = useState(enabled)
  const [localDays, setLocalDays] = useState(retentionDays)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLocalEnabled(enabled)
  }, [enabled])

  useEffect(() => {
    setLocalDays(retentionDays)
  }, [retentionDays])

  const handleToggle = () => {
    const newEnabled = !localEnabled
    setLocalEnabled(newEnabled)
    onEnabledChange?.(newEnabled)
    setError(null)
  }

  const handleDaysChange = (e) => {
    const value = parseInt(e.target.value, 10)
    
    if (isNaN(value)) {
      setError('Please enter a valid number')
      return
    }

    if (value < 1) {
      setError('Retention period must be at least 1 day')
      return
    }

    if (value > 3650) {
      setError('Retention period cannot exceed 10 years (3650 days)')
      return
    }

    setLocalDays(value)
    onRetentionDaysChange?.(value)
    setError(null)
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 flex items-center gap-2">
        <Archive size={18} className="text-slate-700 dark:text-slate-300" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Response Retention Policy
        </h3>
      </div>

      {/* Body */}
      <div className="px-4 py-4 space-y-4 bg-white dark:bg-slate-900/50">
        {/* Description */}
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Automatically archive responses after a specified number of days. Archived responses are preserved
          in the database but excluded from active analytics and counts.
        </p>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Enable Retention Policy
            </label>
          </div>
          <button
            onClick={handleToggle}
            className="relative inline-flex h-8 w-14 items-center rounded-full bg-slate-300 transition-colors dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            style={{
              backgroundColor: localEnabled ? '#ea580c' : undefined,
            }}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                localEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Retention Days Input */}
        {localEnabled && (
          <div className="space-y-2">
            <label htmlFor="retention-days" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Keep responses for
            </label>
            <div className="flex items-center gap-2">
              <input
                id="retention-days"
                type="number"
                min="1"
                max="3650"
                value={localDays}
                onChange={handleDaysChange}
                className="w-24 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:ring-orange-500/30"
              />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">days</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Responses older than this period will be automatically archived (minimum: 1 day, maximum: 3650 days)
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 p-3 flex items-start gap-2 dark:bg-red-900/20">
            <AlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Info Box */}
        {localEnabled && (
          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <p className="text-xs text-blue-700 dark:text-blue-200">
              <strong>Archival runs daily at 02:00 UTC.</strong> Archived responses remain in the database and can be viewed
              in the response browser. They are automatically excluded from analytics and response counts.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
