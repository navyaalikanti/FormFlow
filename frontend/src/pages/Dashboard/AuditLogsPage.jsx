import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileClock, Search, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import DashboardShell from '../../components/dashboard/DashboardShell'
import Card from '../../components/ui/Card'
import api from '../../lib/api'

const ACTION_LABELS = {
  CREATE_FORM: 'Create Form',
  PUBLISH_FORM: 'Publish Form',
  UNPUBLISH_FORM: 'Unpublish Form',
  ARCHIVE_FORM: 'Archive Form',
  RESTORE_FORM: 'Restore Form',
  DUPLICATE_FORM: 'Duplicate Form',
  UPDATE_FORM: 'Update Form',
  RESTORE_VERSION: 'Restore Version',
  DELETE_RESPONSE: 'Delete Response',
  BULK_DELETE_RESPONSES: 'Bulk Delete Responses',
}

const ACTION_COLORS = {
  CREATE_FORM: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  PUBLISH_FORM: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  UNPUBLISH_FORM: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  ARCHIVE_FORM: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  RESTORE_FORM: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  DUPLICATE_FORM: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  UPDATE_FORM: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  RESTORE_VERSION: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  DELETE_RESPONSE: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  BULK_DELETE_RESPONSES: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

export default function AuditLogsPage() {
  const { t } = useTranslation()
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Pagination & Filters State
  const [page, setPage] = useState(1)
  const [limit] = useState(15)
  const [selectedFormId, setSelectedFormId] = useState('')
  const [selectedAction, setSelectedAction] = useState('')
  const [forms, setForms] = useState([])

  // Fetch form options for filtering
  useEffect(() => {
    api.get('/forms')
      .then((res) => {
        if (res.data && res.data.items) {
          setForms(res.data.items)
        }
      })
      .catch((err) => {
        console.error('Failed to load forms for filter', err)
      })
  }, [])

  // Fetch audit logs
  const fetchLogs = () => {
    setLoading(true)
    setError(null)
    
    const params = {
      page,
      limit,
    }
    if (selectedFormId) params.form_id = selectedFormId
    if (selectedAction) params.action = selectedAction

    api.get('/v1/audit-logs', { params })
      .then((res) => {
        if (res.data) {
          setLogs(res.data.items || [])
          setTotal(res.data.total || 0)
        }
      })
      .catch((err) => {
        console.error('Failed to fetch audit logs', err)
        setError(t('auditLogs.errorLoading'))
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchLogs()
  }, [page, selectedFormId, selectedAction])

  // Helper to format details text human-readably
  const formatDetails = (log) => {
    const details = log.details || {}
    switch (log.action) {
      case 'BULK_DELETE_RESPONSES':
        return t('auditLogs.details.responsesDeleted', { count: details.deleted_count || 0 })
      case 'DELETE_RESPONSE':
        return t('auditLogs.details.responseDeleted', { id: details.response_id || '' })
      case 'PUBLISH_FORM':
        return t('auditLogs.details.publishedVersion', { version: details.version_number || '' })
      case 'RESTORE_VERSION':
        return t('auditLogs.details.restoredVersion', { from: details.restored_from_version_number || '', to: details.version_number || '' })
      case 'DUPLICATE_FORM':
        return t('auditLogs.details.formDuplicated', { title: details.title || '' })
      case 'CREATE_FORM':
        return t('auditLogs.details.formDraftCreated')
      case 'UPDATE_FORM':
        return t('auditLogs.details.formUpdated')
      case 'UNPUBLISH_FORM':
        return t('auditLogs.details.formUnpublished')
      case 'ARCHIVE_FORM':
        return t('auditLogs.details.formArchived')
      case 'RESTORE_FORM':
        return t('auditLogs.details.formRestored')
      default:
        return details.message ? t('auditLogs.details.fallback', { message: details.message }) : JSON.stringify(details)
    }
  }

  const formatDateTime = (isoString) => {
    if (!isoString) return '—'
    const date = new Date(isoString)
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <DashboardShell
      title={t('auditLogs.title')}
      subtitle={t('auditLogs.subtitle')}
      action={
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RefreshCw size={15} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('auditLogs.refresh')}
        </button>
      }
    >
      {/* Filters Bar */}
      <Card className="mb-6 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('auditLogs.filterByForm')}
            </label>
            <select
              value={selectedFormId}
              onChange={(e) => {
                setSelectedFormId(e.target.value)
                setPage(1)
              }}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-brand-500"
            >
              <option value="">{t('auditLogs.allForms')}</option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('auditLogs.filterByAction')}
            </label>
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value)
                setPage(1)
              }}
              className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-brand-500"
            >
              <option value="">{t('auditLogs.allActions')}</option>
              {Object.keys(ACTION_LABELS).map((key) => (
                <option key={key} value={key}>
                  {t(`auditLogs.actions.${key}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t('auditLogs.loading')}</p>
          </div>
        ) : error ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <h3 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">{error}</h3>
            <button
              onClick={fetchLogs}
              className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-600"
            >
              {t('auditLogs.tryAgain')}
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
            <FileClock className="h-12 w-12 text-slate-300 dark:text-slate-700" />
            <h3 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-200">{t('auditLogs.noLogsFound')}</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              {t('auditLogs.noLogsDesc')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4">{t('auditLogs.columns.action')}</th>
                  <th className="px-6 py-4">{t('auditLogs.columns.user')}</th>
                  <th className="px-6 py-4">{t('auditLogs.columns.form')}</th>
                  <th className="px-6 py-4">{t('auditLogs.columns.details')}</th>
                  <th className="px-6 py-4 text-right">{t('auditLogs.columns.dateTime')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="group transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
                  >
                    <td className="whitespace-nowrap px-6 py-4.5">
                      <span
                        className={`inline-flex rounded-lg px-2 py-1 text-xs font-semibold tracking-tight ${
                          ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {t(`auditLogs.actions.${log.action}`, { defaultValue: log.action })}
                      </span>
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {log.user_name || 'Admin'}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        {log.user_email || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4.5 max-w-[200px] truncate">
                      {log.form_title ? (
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {log.form_title}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4.5 text-slate-700 dark:text-slate-300">
                      {formatDetails(log)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4.5 text-right font-medium text-slate-500 dark:text-slate-400">
                      {formatDateTime(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {t('auditLogs.pagination.showing')} <span className="font-semibold text-slate-800 dark:text-slate-200">
                {(page - 1) * limit + 1}
              </span> {t('auditLogs.pagination.to')} <span className="font-semibold text-slate-800 dark:text-slate-200">
                {Math.min(page * limit, total)}
              </span> {t('auditLogs.pagination.of')} <span className="font-semibold text-slate-800 dark:text-slate-200">{total}</span> {t('auditLogs.pagination.logs')}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <ChevronLeft size={16} />
              </button>
              
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('auditLogs.pagination.pageOf', { current: page, total: totalPages, defaultValue: `Page ${page} of ${totalPages}` })}
              </span>
              
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </DashboardShell>
  )
}
