/**
 * VersionHistoryPanel – displays form version history and allows restoring previous versions
 */
import { useEffect, useState } from 'react'
import { AlertCircle, Copy, RotateCcw, Clock } from 'lucide-react'
import { builderService } from '../../services/builderService'

export default function VersionHistoryPanel({ formId, currentVersion, onVersionRestored }) {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [restoring, setRestoring] = useState(null)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    if (formId) {
      loadVersionHistory()
    }
  }, [formId])

  const loadVersionHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await builderService.getFormVersions(formId)
      setVersions(response.items || [])
    } catch (err) {
      setError('Failed to load version history')
      console.error('Error loading versions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreVersion = async (versionId) => {
    if (!window.confirm('Restore this version as a new draft? This will not affect existing versions.')) {
      return
    }

    try {
      setRestoring(versionId)
      setError(null)
      await builderService.restoreVersion(formId, versionId)
      // Notify parent to refresh form
      if (onVersionRestored) {
        onVersionRestored()
      }
      // Reload versions after restore
      await loadVersionHistory()
    } catch (err) {
      setError('Failed to restore version')
      console.error('Error restoring version:', err)
    } finally {
      setRestoring(null)
    }
  }

  const copyLinkToken = (linkToken) => {
    if (linkToken) {
      navigator.clipboard.writeText(linkToken)
      setCopied(linkToken)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status) => {
    const statusStyles = {
      published: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      draft: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      archived: 'bg-slate-50 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400',
    }
    return statusStyles[status] || statusStyles.draft
  }

  if (!formId) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <Clock size={24} className="mb-2 text-slate-400" />
        <p className="text-sm text-slate-500">No form selected</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <div className="mb-2 animate-spin">
          <Clock size={24} className="text-orange-500" />
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">Loading versions...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Version History</h3>
        <p className="text-xs text-slate-500">All published versions with immutable snapshots</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/30 dark:bg-red-900/20">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Version list */}
      {versions.length > 0 ? (
        <div className="space-y-2">
          {versions.map((version) => (
            <div
              key={version.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800"
            >
              {/* Version header */}
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Version {version.version_number}
                    </span>
                    {currentVersion?.id === version.id && (
                      <span className="inline-block rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{version.change_summary}</p>
                </div>
                <span className={`inline-block rounded-md px-2 py-1 text-xs font-medium capitalize ${getStatusBadge(version.status)}`}>
                  {version.status}
                </span>
              </div>

              {/* Dates */}
              <div className="mb-3 space-y-1">
                {version.published_at && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Published: <span className="font-medium">{formatDate(version.published_at)}</span>
                  </p>
                )}
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Created: <span className="font-medium">{formatDate(version.created_at)}</span>
                </p>
              </div>

              {/* Link token and actions */}
              {version.link_token && version.status === 'published' && (
                <div className="mb-3 space-y-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      readOnly
                      value={version.link_token}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    />
                    <button
                      onClick={() => copyLinkToken(version.link_token)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-orange-900/20"
                      title="Copy link token"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  {copied === version.link_token && (
                    <p className="text-xs text-green-600 dark:text-green-400">Link token copied!</p>
                  )}
                </div>
              )}

              {/* Restore button */}
              {version.status === 'published' && currentVersion?.id !== version.id && (
                <button
                  onClick={() => handleRestoreVersion(version.id)}
                  disabled={restoring === version.id}
                  className="w-full rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                >
                  {restoring === version.id ? (
                    <span className="flex items-center justify-center gap-1">
                      <span className="animate-spin">⟳</span>
                      Restoring...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1">
                      <RotateCcw size={12} />
                      Restore as Draft
                    </span>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center dark:border-slate-700">
          <Clock size={20} className="mx-auto mb-2 text-slate-400" />
          <p className="text-xs text-slate-500 dark:text-slate-400">No versions yet. Publish a form to create a version.</p>
        </div>
      )}

      {/* Refresh button */}
      <button
        onClick={loadVersionHistory}
        disabled={loading}
        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        Refresh
      </button>
    </div>
  )
}
