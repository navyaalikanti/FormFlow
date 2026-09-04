import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Archive, CirclePlus, Copy, Eye, FileText, Filter, MoreHorizontal, Pencil, Search, Share2, Trash2, X } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import DashboardShell from '../../components/dashboard/DashboardShell'
import StatusBadge, { getCollectionStatus } from '../../components/StatusBadge'
import PublishConfirmModal from '../../components/modals/PublishConfirmModal'
import { builderService } from '../../services/builderService'
import api from '../../lib/api'

const STATUS_STYLE = {
  published: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  live_draft: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  draft: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  archived: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
}

function getEffectiveStatus(form) {
  if (form.status === 'draft' && form.published_version_id) return 'live_draft'
  return form.status
}

function formatDate(iso, t) {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60_000) return t('forms.justNow')
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}${t('forms.minutesAgo')}`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}${t('forms.hoursAgo')}`
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}${t('forms.daysAgo')}`
  return d.toLocaleDateString()
}

function DropdownMenu({ form, onDelete, onDuplicate, onEdit, onPublish, onArchive, onRestore, t }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const effectiveStatus = getEffectiveStatus(form)

  useEffect(() => {
    const handleClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p) }}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-500/10 hover:text-brand-500"
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-48 rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 animate-fade-in">
          <button
            onClick={() => { setOpen(false); onEdit(form) }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Pencil size={14} /> {t('forms.dropdownEdit')}
          </button>
          
          {effectiveStatus === 'draft' && (
            <button
              onClick={() => { setOpen(false); onPublish(form) }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
            >
              <Share2 size={14} /> {t('forms.dropdownPublish')}
            </button>
          )}

          {effectiveStatus === 'live_draft' && (
            <>
              <button
                onClick={() => { setOpen(false); onPublish(form) }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
              >
                <Share2 size={14} /> {t('forms.dropdownPublishDraft')}
              </button>
              <button
                onClick={() => { setOpen(false); onArchive(form) }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Archive size={14} /> {t('forms.dropdownArchive')}
              </button>
            </>
          )}

          {effectiveStatus === 'published' && (
            <>
              <button
                onClick={() => { setOpen(false); onArchive(form) }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Archive size={14} /> {t('forms.dropdownArchive')}
              </button>
            </>
          )}

          {effectiveStatus === 'archived' && (
            <button
              onClick={() => { setOpen(false); onRestore(form) }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Eye size={14} /> {t('forms.dropdownRestore')}
            </button>
          )}

          <button
            onClick={() => { setOpen(false); onDuplicate(form) }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Copy size={14} /> {t('forms.dropdownDuplicate')}
          </button>

          <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
          
          <button
            onClick={() => { setOpen(false); onDelete(form) }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 size={14} /> {t('forms.dropdownDelete')}
          </button>
        </div>
      )}
    </div>
  )
}

function NewFormModal({ onClose, onCreate, t }) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      await onCreate(title.trim(), desc.trim())
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-fade-in">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">New Form</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Form Title *</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Customer Feedback"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Description</label>
            <textarea
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Optional description…"
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
            >
              {loading ? t('common.loading') : 'Create & Build'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FormsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [formToPublish, setFormToPublish] = useState(null)
  const [publishLoading, setPublishLoading] = useState(false)
  const filterRef = useRef()

  useEffect(() => {
    const handleClick = (e) => { if (!filterRef.current?.contains(e.target)) setShowFilterMenu(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/forms')
      setForms(res.data.items || [])
    } catch (e) {
      console.error('Failed to load forms', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (title, description) => {
    const res = await api.post('/forms', {
      title,
      description: description || null,
      sections: [{ title: 'Untitled Section', section_order: 0 }],
    })
    const newForm = res.data
    setForms((prev) => [newForm, ...prev])
    navigate(`/dashboard/forms/${newForm.id}/build`)
  }

  const handleDelete = async (form) => {
    if (!window.confirm(`Delete "${form.title}"? This cannot be undone.`)) return
    try {
      await api.delete(`/forms/${form.id}`)
      setForms((prev) => prev.filter((f) => f.id !== form.id))
    } catch (e) { console.error(e) }
  }

  const handleDuplicate = async (form) => {
    try {
      const res = await api.post(`/forms/${form.id}/duplicate`)
      setForms((prev) => [res.data.form, ...prev])
    } catch (e) { console.error(e) }
  }

  const triggerPublish = (form) => {
    setFormToPublish(form)
  }

  const handlePublishConfirm = async (publishOptions) => {
    if (!formToPublish) return
    setPublishLoading(true)
    try {
      const res = await builderService.publishForm(formToPublish.id, publishOptions)
      const publishedForm = res.form || res
      setForms((prev) => prev.map((f) => (f.id === formToPublish.id ? publishedForm : f)))
      setFormToPublish(null)
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.detail || 'Failed to publish form')
    } finally {
      setPublishLoading(false)
    }
  }

  const handleArchive = async (form) => {
    if (!window.confirm(`Archive "${form.title}"? It will no longer accept responses.`)) return
    try {
      const res = await builderService.archiveForm(form.id)
      setForms((prev) => prev.map((f) => (f.id === form.id ? res : f)))
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.detail || 'Failed to archive form')
    }
  }

  const handleRestore = async (form) => {
    try {
      const res = await builderService.restoreForm(form.id)
      setForms((prev) => prev.map((f) => (f.id === form.id ? res : f)))
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.detail || 'Failed to restore form')
    }
  }

  const filtered = forms.filter((f) => {
    const matchesSearch = f.title.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false

    if (statusFilter === 'all') return true
    return getEffectiveStatus(f) === statusFilter
  })

  return (
    <>
      <DashboardShell
        title={t('forms.title')}
        subtitle={t('forms.subtitle')}
        action={
          <Button onClick={() => setShowModal(true)}>
            <CirclePlus size={16} className="mr-2" />
            New Form
          </Button>
        }
      >
        {/* Search bar */}
        <div className="mb-6 flex items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search')}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            />
          </div>
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilterMenu((p) => !p)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition duration-200 ${
                statusFilter !== 'all'
                  ? 'border-brand-500 bg-brand-50/80 text-brand-600 dark:border-brand-500/50 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/15'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand-400 hover:text-brand-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Filter size={15} />
              <span>
                {statusFilter === 'all' && t('common.filter')}
                {statusFilter === 'published' && t('forms.published')}
                {statusFilter === 'live_draft' && t('forms.liveDraft')}
                {statusFilter === 'draft' && t('forms.draft')}
                {statusFilter === 'archived' && t('forms.archived')}
              </span>
            </button>
            {showFilterMenu && (
              <div className="absolute right-0 mt-2 z-50 w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg dark:border-slate-800 dark:bg-slate-900 animate-fade-in animate-in fade-in slide-in-from-top-1 duration-150">
                {[
                  { value: 'all', label: t('common.filter') },
                  { value: 'published', label: t('forms.published') },
                  { value: 'live_draft', label: t('forms.liveDraft') },
                  { value: 'draft', label: t('forms.draft') },
                  { value: 'archived', label: t('forms.archived') },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setStatusFilter(opt.value)
                      setShowFilterMenu(false)
                    }}
                    className={`flex w-full items-center justify-between px-4 py-2 text-sm transition-colors ${
                      statusFilter === opt.value
                        ? 'bg-brand-50/80 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {statusFilter === opt.value && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10">
              <FileText size={22} className="text-brand-500" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              {search || statusFilter !== 'all' ? t('common.noData') : t('forms.noForms')}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {search || statusFilter !== 'all' ? t('common.noData') : t('forms.noForms')}
            </p>
          </div>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="whitespace-nowrap px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('forms.formName')}</th>
                    <th className="whitespace-nowrap px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('forms.status')}</th>
                    <th className="whitespace-nowrap px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('forms.lastModified')}</th>
                    <th className="px-6 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((form) => (
                    <tr
                      key={form.id}
                      className="group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      onClick={() => navigate(`/dashboard/forms/${form.id}/build`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                            <FileText size={16} />
                          </span>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 dark:text-white">{form.title}</span>
                            {form.description && (
                              <p className="line-clamp-1 text-xs text-slate-400">{form.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <StatusBadge status={getEffectiveStatus(form)} />
                          {getEffectiveStatus(form) !== 'draft' && getCollectionStatus(form) !== 'accepting' && (
                            <StatusBadge status={getCollectionStatus(form)} />
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-500 dark:text-slate-400">{formatDate(form.updated_at, t)}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-1 opacity-90 sm:opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                          <button
                            title={t('forms.editForm')}
                            onClick={() => navigate(`/dashboard/forms/${form.id}/build`)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-500/10 hover:text-brand-500"
                          >
                            <Pencil size={15} />
                          </button>
                          <DropdownMenu
                            form={form}
                            onEdit={(f) => navigate(`/dashboard/forms/${f.id}/build`)}
                            onPublish={triggerPublish}
                            onArchive={handleArchive}
                            onRestore={handleRestore}
                            onDuplicate={handleDuplicate}
                            onDelete={handleDelete}
                            t={t}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </DashboardShell>

      {showModal && <NewFormModal onClose={() => setShowModal(false)} onCreate={handleCreate} t={t} />}

      {formToPublish && (
        <PublishConfirmModal
          formTitle={formToPublish.title}
          onConfirm={handlePublishConfirm}
          onCancel={() => setFormToPublish(null)}
          loading={publishLoading}
        />
      )}
    </>
  )
}
