/**
 * VersionHistoryModal – Display form version history
 */
import { X, Clock, Check, Archive, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function VersionHistoryModal({
  formId,
  onClose,
  onRestore,
  currentVersionId,
  loading: parentLoading,
  builderService,
}) {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [restoringVersionId, setRestoringVersionId] = useState(null)

  useEffect(() => {
    if (!formId) return

    const loadVersions = async () => {
      try {
        setLoading(true)
        const data = await builderService.getFormVersions(formId)
        setVersions(data.items || [])
      } catch (err) {
        console.error('Failed to load versions:', err)
        setError(err?.response?.data?.detail || 'Failed to load version history')
      } finally {
        setLoading(false)
      }
    }

    loadVersions()
  }, [formId, builderService])

  const handleRestore = async (versionId) => {
    if (!formId) return

    setRestoringVersionId(versionId)
    try {
      const result = await builderService.restoreVersion(formId, versionId)
      onRestore(result)
      onClose()
    } catch (err) {
      console.error('Failed to restore version:', err)
      setError(err?.response?.data?.detail || 'Failed to restore version')
    } finally {
      setRestoringVersionId(null)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status, versionId) => {
    if (versionId === currentVersionId) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
          <Check size={12} />
          Current
        </span>
      )
    }

    if (status === 'published') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <Check size={12} />
          Published
        </span>
      )
    }

    if (status === 'archived') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-400">
          <Archive size={12} />
          Archived
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        Draft
      </span>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 animate-fade-in flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Clock size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Version History</h2>
          </div>
          <button
            onClick={onClose}
            disabled={parentLoading || restoringVersionId !== null}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mb-2 inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-orange-500 dark:border-slate-600 dark:border-t-orange-400" />
                <p className="text-sm text-slate-600 dark:text-slate-400">Loading versions...</p>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12">
              <Clock size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-600 dark:text-slate-400">No versions yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                Publish your form to create the first version.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 hover:bg-slate-50 transition dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                          Version {version.version_number}
                        </h3>
                        {getStatusBadge(version.status, version.id)}
                      </div>
                      
                      {version.change_summary && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                          {version.change_summary}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-500">
                        {version.published_at && (
                          <div>
                            <span className="font-medium">Published:</span> {formatDate(version.published_at)}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Created:</span> {formatDate(version.created_at)}
                        </div>
                      </div>
                    </div>

                    {version.id !== currentVersionId && version.status === 'published' && (
                      <button
                        onClick={() => handleRestore(version.id)}
                        disabled={parentLoading || restoringVersionId !== null}
                        className="ml-4 flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        {restoringVersionId === version.id ? (
                          <>
                            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-300" />
                            Restoring…
                          </>
                        ) : (
                          <>
                            <RotateCcw size={14} />
                            Restore
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button
            onClick={onClose}
            disabled={parentLoading || restoringVersionId !== null}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
