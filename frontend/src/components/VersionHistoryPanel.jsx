/**
 * VersionHistoryPanel – Display form version history
 */
import { format } from 'date-fns'
import StatusBadge from './StatusBadge'

export default function VersionHistoryPanel({ versions, currentFormStatus }) {
  if (!versions || versions.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">No version history yet</p>
      </div>
    )
  }

  // Sort versions by number descending (newest first)
  const sortedVersions = [...versions].sort((a, b) => b.version_number - a.version_number)

  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Version History</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Total versions: {versions.length}
        </p>
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {sortedVersions.map((version) => (
          <div
            key={version.id}
            className="flex items-center justify-between px-6 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Version {version.version_number}
                </p>
                <StatusBadge status={version.status} />
              </div>

              <div className="mt-2 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                {version.published_at && (
                  <span>
                    Published: {format(new Date(version.published_at), 'MMM d, yyyy')}
                  </span>
                )}
                {version.created_at && (
                  <span>
                    Created: {format(new Date(version.created_at), 'MMM d, yyyy HH:mm')}
                  </span>
                )}
              </div>
            </div>

            {version.status === 'published' && (
              <button
                className="ml-4 flex-shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                View
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
