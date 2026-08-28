import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowDownUp,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Eye,
  ExternalLink,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Filter,
  Image as ImageIcon,
  Layers,
  Loader2,
  Search,
  X,
  ZoomIn,
  ZoomOut,
  HelpCircle,
  Inbox,
  BarChart3,
  Trash2,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import DashboardShell from '../../components/dashboard/DashboardShell'
import StatusBadge, { getCollectionStatus } from '../../components/StatusBadge'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import api from '../../lib/api'
import { fetchFormResponses, deleteFormResponse, deleteFormResponsesBulk } from '../../services/formSubmissionService'
import { exportFormResponses } from '../../services/responseExportService'
import { getAdminFileDownloadUrl } from '../../services/fileUploadService'

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return `${dateFormatter.format(date)}, ${timeFormatter.format(date)}`
}

function parseLocalDate(value, endOfDay = false) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  if (endOfDay) {
    date.setHours(23, 59, 59, 999)
  }
  return date.getTime()
}

// Check for file format support
function isFileValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && (
    value.filename ||
    value.public_url ||
    value.download_url ||
    value.file_key ||
    value.original_name
  )
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = Number(bytes) || 0
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function getFileMeta(file) {
  const name = String(file?.original_name || file?.filename || file?.name || '').toLowerCase()
  const type = String(file?.content_type || file?.mime_type || '').toLowerCase()

  if (type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name)) {
    return { icon: ImageIcon, label: 'Image', accent: 'text-emerald-500', kind: 'image' }
  }
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return { icon: FileText, label: 'PDF', accent: 'text-rose-500', kind: 'pdf' }
  }
  if (type.includes('word') || /\.(doc|docx)$/i.test(name)) {
    return { icon: FileText, label: 'Word', accent: 'text-blue-500', kind: 'word' }
  }
  if (type.includes('excel') || type.includes('spreadsheet') || /\.(xls|xlsx|csv)$/i.test(name)) {
    return { icon: FileSpreadsheet, label: 'Excel', accent: 'text-emerald-600', kind: 'excel' }
  }
  if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z') || name.endsWith('.tar') || name.endsWith('.gz')) {
    return { icon: FileArchive, label: 'Archive', accent: 'text-amber-500', kind: 'unsupported' }
  }
  if (type.startsWith('text/') || /\.(txt|md)$/i.test(name)) {
    return { icon: FileText, label: 'Text', accent: 'text-slate-500', kind: 'text' }
  }
  return { icon: FileText, label: 'Document', accent: 'text-slate-500', kind: 'word' }
}

function getPreviewKind(file) {
  return getFileMeta(file).kind
}

function FilePreviewModal({
  file,
  previewUrl,
  previewKind,
  previewText,
  zoom,
  onClose,
  onOpenInNewTab,
  onZoomIn,
  onZoomOut,
  onZoomChange,
  loading = false,
}) {
  const { t } = useTranslation()

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  if (!file) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{t('responses.filePreview')}</p>
            <h3 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
              {file.original_name || file.filename || file.name}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {file.typeLabel} • {formatFileSize(file.size)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(previewKind === 'image' || previewKind === 'text') && (
              <>
                <button
                  type="button"
                  onClick={onZoomOut}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-orange-300 hover:text-orange-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  title={t('responses.zoomOut')}
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onZoomIn}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-orange-300 hover:text-orange-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  title={t('responses.zoomIn')}
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  {t('responses.zoom')}
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={(event) => onZoomChange(Number(event.target.value))}
                    className="w-28 accent-orange-500"
                  />
                </label>
              </>
            )}
            <button
              type="button"
              onClick={onOpenInNewTab}
              disabled={!previewUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ExternalLink className="h-4 w-4" />
              {t('responses.open')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              title={t('responses.closePreview')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-950">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('responses.loadingPreview')}
              </div>
            </div>
          ) : previewKind === 'image' && previewUrl ? (
            <div className="flex h-full items-center justify-center overflow-auto p-6">
              <img
                src={previewUrl}
                alt={file.original_name || file.filename || file.name}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center top' }}
                className="max-h-none max-w-none rounded-2xl bg-white shadow-2xl"
              />
            </div>
          ) : previewKind === 'text' ? (
            <div className="h-full overflow-auto p-6">
              <pre
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                className="min-h-full whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-white p-5 font-mono text-sm leading-6 text-slate-800 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              >
                {previewText || t('responses.noTextPreview')}
              </pre>
            </div>
          ) : (
            <iframe title={file.original_name || file.filename || file.name} src={previewUrl} className="h-full w-full border-0 bg-white" />
          )}
        </div>
      </div>
    </div>
  )
}

function valueToText(value) {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.map((item) => valueToText(item)).join(' ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function getSubmissionSearchText(submission) {
  const respondentName =
    submission.respondent_name ||
    submission.respondent_identifier ||
    submission.respondent_email ||
    submission.respondent ||
    ''

  const answerText = (submission.answers || [])
    .map((answer) => [
      answer.field_label,
      answer.field_key,
      answer.field_type,
      answer.display_value,
      valueToText(answer.value),
    ].join(' '))
    .join(' ')

  return [
    submission.response_id,
    submission.submitted_at,
    formatDateTime(submission.submitted_at),
    respondentName,
    answerText,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function getDateRangeBounds(preset, customStart, customEnd) {
  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  switch (preset) {
    case 'today':
      return { start: startOfToday.getTime(), end: endOfToday.getTime() }
    case 'yesterday': {
      const start = new Date(startOfToday)
      start.setDate(start.getDate() - 1)
      const end = new Date(startOfToday)
      end.setMilliseconds(-1)
      return { start: start.getTime(), end: end.getTime() }
    }
    case 'last7': {
      const start = new Date(startOfToday)
      start.setDate(start.getDate() - 6)
      return { start: start.getTime(), end: endOfToday.getTime() }
    }
    case 'last30': {
      const start = new Date(startOfToday)
      start.setDate(start.getDate() - 29)
      return { start: start.getTime(), end: endOfToday.getTime() }
    }
    case 'custom': {
      const start = parseLocalDate(customStart, false)
      const end = parseLocalDate(customEnd, true)
      if (start !== null && end !== null) {
        return start <= end ? { start, end } : { start: end, end: start }
      }
      if (start !== null) return { start, end: null }
      if (end !== null) return { start: null, end }
      return { start: null, end: null }
    }
    default:
      return { start: null, end: null }
  }
}

function getRespondentLabel(submission) {
  return (
    submission.respondent_name ||
    submission.respondent_identifier ||
    submission.respondent_email ||
    submission.respondent ||
    ''
  )
}

function renderValue(answer, { onView, onDownload } = {}, t) {
  const { field_type: fieldType, value } = answer

  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-400 dark:text-slate-500">—</span>
  }

  if (fieldType === 'file') {
    const fileItems = Array.isArray(answer.files) && answer.files.length > 0
      ? answer.files
      : isFileValue(value)
        ? [value]
        : []

    if (fileItems.length > 0) {
      return (
        <div className="space-y-2">
          {fileItems.map((fileItem, index) => (
            <div
              key={fileItem.file_key || fileItem.object_path || `${fileItem.original_name || fileItem.filename || index}-${index}`}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                    <FileText className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {fileItem.original_name || fileItem.filename || fileItem.name || `File ${index + 1}`}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {(fileItem.content_type || fileItem.mime_type || 'File').replace('application/', '').replace('text/', 'Text ')} • {formatFileSize(fileItem.size)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onView?.(fileItem, 'view')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {t('responses.view')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownload?.(fileItem, 'download')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t('responses.download')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }
  }

  if (Array.isArray(value)) {
    return <span>{value.join(', ')}</span>
  }

  if (typeof value === 'object') {
    return <span className="break-words">{JSON.stringify(value)}</span>
  }

  return <span className="break-words">{String(value)}</span>
}

function EmptyResponsesState({ t }) {
  return (
    <Card className="p-8 text-center border border-slate-200 dark:border-slate-800">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
        {t('responses.noResponsesSubmitted')}
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
        {t('responses.responsesWillAppear')}
      </p>
    </Card>
  )
}

function NoMatchState({ t }) {
  return (
    <Card className="p-6 text-center border border-slate-200 dark:border-slate-800">
      <p className="text-xs font-semibold text-slate-900 dark:text-white">{t('responses.noMatchingResponses')}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('responses.tryAdjustingFilters')}</p>
    </Card>
  )
}

function PaginationControls({ currentPage, totalPages, onPageChange, displayStart, displayEnd, totalCount, itemsPerPage, onItemsPerPageChange, itemsPerPageOptions, t }) {
  const generatePageNumbers = () => {
    const pages = []
    const maxVisible = 5
    const halfVisible = Math.floor(maxVisible / 2)
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      let start = Math.max(1, currentPage - halfVisible)
      let end = Math.min(totalPages, start + maxVisible - 1)
      
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1)
      }
      
      if (start > 1) {
        pages.push(1)
        if (start > 2) pages.push('...')
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...')
        pages.push(totalPages)
      }
    }
    
    return pages
  }
  
  const pages = generatePageNumbers()
  
  return (
    <div className="flex flex-col gap-4 mt-6">
      <div className="flex items-center justify-between">
        {/* Left: Rows per page selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{t('responses.rowsPerPage')}:</span>
          <div className="relative">
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="h-8 appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer transition hover:border-brand-500"
            >
              {itemsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Center: Info text */}
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {t('responses.showing')} {displayStart}–{displayEnd} {t('responses.of')} {totalCount}
        </span>

        {/* Right: Pagination controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 transition hover:border-brand-500 hover:text-brand-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-600"
            title={t('responses.previousPage')}
          >
            <ChevronLeft size={16} />
          </button>

          {pages.map((page, idx) => (
            page === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">…</span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`inline-flex items-center justify-center h-8 w-8 rounded-lg text-xs font-semibold transition ${
                  page === currentPage
                    ? 'bg-brand-500 text-white'
                    : 'border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-brand-500 hover:text-brand-500'
                }`}
              >
                {page}
              </button>
            )
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 transition hover:border-brand-500 hover:text-brand-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-600"
            title={t('responses.nextPage')}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function generateResponseTrend(responses) {
  if (!responses || responses.length === 0) {
    return null
  }

  // Group responses by date
  const dateMap = {}
  responses.forEach((response) => {
    if (!response.submitted_at) return
    const date = new Date(response.submitted_at)
    const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD format
    dateMap[dateKey] = (dateMap[dateKey] || 0) + 1
  })

  if (Object.keys(dateMap).length === 0) {
    return null
  }

  // Find min and max dates
  const dates = Object.keys(dateMap).sort()
  const minDate = new Date(dates[0])
  const maxDate = new Date(dates[dates.length - 1])

  // Generate all dates in range
  const trendData = []
  const currentDate = new Date(minDate)

  while (currentDate <= maxDate) {
    const dateKey = currentDate.toISOString().split('T')[0]
    const count = dateMap[dateKey] || 0
    const dateObj = new Date(dateKey)
    
    trendData.push({
      date: dateKey,
      displayDate: dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }),
      responses: count,
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return trendData
}

function ResponseTrendTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          padding: '10px 12px',
        }}
      >
        <p style={{ fontSize: '12px', color: '#475569', fontWeight: '500', margin: '0 0 4px 0' }}>
          {label}
        </p>
        <p style={{ fontSize: '13px', color: '#F97316', fontWeight: '600', margin: '0' }}>
          Responses: {payload[0].value}
        </p>
      </div>
    )
  }
  return null
}

function ResponseTrendChart({ responses, selectedVersion, t }) {
  const trendData = generateResponseTrend(responses)

  if (!trendData) {
    return (
      <Card className="p-8 border border-slate-200 dark:border-slate-800 shadow-soft animate-fadeIn">
        <div className="flex flex-col items-center justify-center">
          <BarChart3 size={40} className="text-slate-350 dark:text-slate-700 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('responses.noResponsesTrend')}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 border border-slate-200 dark:border-slate-800 shadow-soft animate-fadeIn">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('responses.responseTrendTitle')}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('responses.responseTrendDesc')}
        </p>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
            <defs>
              <linearGradient id="colorResponses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              dark="#1e293b"
              vertical={false}
            />
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              dy={5}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              dx={-10}
            />
            <Tooltip
              content={<ResponseTrendTooltip />}
              cursor={{ stroke: '#F97316', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="responses"
              stroke="#F97316"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorResponses)"
              dot={{ fill: '#F97316', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function SummaryCard({ label, value, subtext, icon: Icon, footer, badge, lastUpdated }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900 flex flex-col h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft">
      {/* Header: Label and Icon */}
      <div className="flex items-start justify-between mb-2.5">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none flex-1 pr-2">
          {label}
        </span>
        {Icon && (
          <span className="flex-shrink-0 rounded-lg bg-brand-500/10 p-1.5 text-brand-500 dark:bg-brand-500/20 dark:text-brand-400">
            <Icon size={16} className="stroke-2" />
          </span>
        )}
      </div>

      {/* Main Value */}
      <div className="mb-2">
        <div className="text-2.5xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
          {value}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-800 mb-2"></div>

      {/* Subtext / Primary Description */}
      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-snug mb-1.5 line-clamp-2">
        {subtext}
      </p>

      {/* Badge or Footer Info */}
      {badge && (
        <div className="mb-1.5">
          {badge}
        </div>
      )}

      {/* Secondary Metadata / Last Updated */}
      {footer && (
        <p className="text-[11px] text-slate-500 dark:text-slate-500 leading-snug">
          {footer}
        </p>
      )}

      {/* Last Updated */}
      {lastUpdated && (
        <p className="text-[10px] text-slate-400 dark:text-slate-600 leading-snug mt-auto pt-1">
          {lastUpdated}
        </p>
      )}
    </div>
  )
}

function timeAgo(value) {
  if (!value) return ''
  const date = new Date(value)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 0) return 'just now'
  if (seconds < 60) return 'just now'
  
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  }
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }
  
  const days = Math.floor(hours / 24)
  if (days < 30) {
    return `${days} day${days > 1 ? 's' : ''} ago`
  }
  
  const months = Math.floor(days / 30)
  if (months < 12) {
    return `${months} month${months > 1 ? 's' : ''} ago`
  }
  
  const years = Math.floor(months / 12)
  return `${years} year${years > 1 ? 's' : ''} ago`
}

function PageToast({ toast, t }) {
  if (!toast) return null

  const isSuccess = toast.type === 'success'

  return (
    <div className="fixed bottom-4 right-4 z-[60] max-w-sm rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl ${
            isSuccess
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
          }`}
        >
          {isSuccess ? <Check size={16} /> : <X size={16} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-900 dark:text-white">
            {isSuccess ? t('responses.exportReady') : t('responses.exportFailed')}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{toast.message}</p>
        </div>
      </div>
    </div>
  )
}

const ORANGE_PALETTE = [
  '#F97316', // Primary Orange
  '#EA580C', // Dark Orange
  '#C2410C', // Darker Orange
  '#FB923C', // Medium Orange
  '#FDBA74', // Light Orange
  '#FED7AA', // Very Light Orange
  '#9A3412', // Rust / Extra Dark
  '#7C2D12', // Mahogany / Deep Rust
]

const RATING_PALETTE = [
  '#FED7AA', // 1 Star
  '#FDBA74', // 2 Stars
  '#FB923C', // 3 Stars
  '#F97316', // 4 Stars
  '#EA580C', // 5 Stars
  '#C2410C', // 6 Stars
  '#9A3412', // 7 Stars
]

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900/95 min-w-[125px] pointer-events-none select-none">
        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{data.option}</p>
        <div className="mt-1 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
          <p>
            Count: <span className="font-semibold text-slate-900 dark:text-white">{data.count}</span>
          </p>
          <p>
            Percentage: <span className="font-semibold text-slate-900 dark:text-white">{data.percentage}%</span>
          </p>
        </div>
      </div>
    )
  }
  return null
}

function ChartLegend({ distribution, palette }) {
  return (
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 justify-center text-[10px] font-semibold text-slate-500 dark:text-slate-405">
      {distribution.map((entry, index) => {
        const color = palette[index % palette.length]
        return (
          <div key={entry.option} className="flex items-center gap-1.5 transition-transform duration-200 hover:scale-105">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span>{entry.option}</span>
          </div>
        )
      })}
    </div>
  )
}

function AnalyticsChartCard({ field, t, onValueClick }) {
  const { fieldLabel, fieldType, totalValidResponses, distribution } = field
  const hasData = totalValidResponses > 0 && distribution && distribution.length > 0
  const palette = fieldType === 'rating' ? RATING_PALETTE : ORANGE_PALETTE

  const containerRef = useRef(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const handleValueClick = (entry, index, event) => {
    if (!entry || !onValueClick) return
    const payload = entry.payload ?? entry
    const rawValue = payload.optionValue ?? payload.option_value ?? payload.option
    const value = rawValue == null ? rawValue : String(rawValue)
    onValueClick({
      fieldId: field.fieldId,
      fieldLabel,
      fieldValue: value,
      fieldType,
      entry: payload,
      index,
      event,
    })
  }

  const handleMouseMove = (e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setTooltipPos({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top - 15,
    })
  }

  const chartElement = useMemo(() => {
    if (!hasData) {
      return (
        <div className="flex h-[240px] flex-col items-center justify-center rounded-xl bg-slate-50/50 dark:bg-slate-900/40">
          <Inbox size={28} className="text-slate-350 dark:text-slate-700" />
          <p className="mt-2 text-sm font-medium text-slate-400 dark:text-slate-500">{t('responses.noDataAvailable')}</p>
        </div>
      )
    }

    if (fieldType === 'dropdown' || fieldType === 'radio') {
      if (distribution.length <= 5) {
        // Pie Chart
        return (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={distribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={3}
                dataKey="count"
                nameKey="option"
                isAnimationActive={true}
                animationDuration={500}
                onClick={handleValueClick}
                style={{ cursor: 'pointer' }}
              >
                {distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
                ))}
              </Pie>
              <Tooltip position={tooltipPos} content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )
      } else {
        // Bar Chart
        return (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={distribution} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
              <XAxis dataKey="option" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip position={tooltipPos} content={<CustomTooltip />} cursor={{ fill: 'rgba(249, 115, 22, 0.03)' }} />
              <Bar
                dataKey="count"
                radius={[4, 4, 0, 0]}
                isAnimationActive={true}
                animationDuration={500}
                onClick={handleValueClick}
              >
                {distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      }
    }

    if (fieldType === 'rating') {
      // Rating Bar Chart
      return (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={distribution} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
            <XAxis dataKey="option" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip position={tooltipPos} content={<CustomTooltip />} cursor={{ fill: 'rgba(249, 115, 22, 0.03)' }} />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
              animationDuration={500}
              onClick={handleValueClick}
            >
              {distribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={palette[index % palette.length] || '#EA580C'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )
    }

    if (fieldType === 'checkbox') {
      // Horizontal Bar Chart
      return (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={distribution}
            layout="vertical"
            margin={{ top: 10, right: 15, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis type="category" dataKey="option" tick={{ fill: '#64748b', fontSize: 11 }} width={80} />
            <Tooltip position={tooltipPos} content={<CustomTooltip />} cursor={{ fill: 'rgba(249, 115, 22, 0.03)' }} />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              isAnimationActive={true}
              animationDuration={500}
              onClick={handleValueClick}
            >
              {distribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )
    }

    return null
  }, [fieldType, distribution, hasData, tooltipPos, palette, t])

  return (
    <Card className="flex flex-col p-6 h-full justify-between border border-slate-205 dark:border-slate-800 shadow-soft animate-fadeIn">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white line-clamp-1">
              {fieldLabel}
            </h3>
            <span className="mt-1 inline-flex items-center rounded-md bg-brand-500/10 px-2 py-0.5 text-xs font-semibold text-brand-500 capitalize">
              {fieldType}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {totalValidResponses}
            </span>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('responses.validResponses')}
            </p>
          </div>
        </div>

        <div ref={containerRef} onMouseMove={handleMouseMove} className="mt-6 relative">
          {chartElement}
        </div>
      </div>

      <div>
        {hasData && <ChartLegend distribution={distribution} palette={palette} />}
        {hasData && (
          <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-[10px] font-semibold text-slate-400 dark:border-slate-800 dark:text-slate-500">
            <HelpCircle size={13} className="shrink-0 text-slate-400 dark:text-slate-600" />
            <span>{t('responses.percentagesCalculated')}</span>
          </div>
        )}
      </div>
    </Card>
  )
}


function ResponseDetailModal({ submission, formName, versionNumber, onClose, openFilePreview, t }) {
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  if (!submission) return null

  const fieldTypeLabel = (type) => {
    const map = {
      short_text: 'Short Text', long_text: 'Long Text', email: 'Email', phone: 'Phone',
      number: 'Number', date: 'Date', dropdown: 'Dropdown', radio: 'Multiple Choice',
      checkbox: 'Checkbox', file: 'File Upload', rating: 'Rating', yes_no: 'Yes / No',
    }
    return map[type] || (type || '').replace(/_/g, ' ')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(2, 6, 23, 0.65)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 animate-modalIn"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-950">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500">Response Details</p>
            <h2 className="mt-0.5 text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {formName || 'Form Response'}
            </h2>
            {versionNumber && (
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                Version {versionNumber}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Meta strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px border-b border-slate-100 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
          <div className="bg-white px-5 py-3.5 dark:bg-slate-950">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Response ID</p>
            <p className="mt-1 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 truncate" title={submission.response_id}>
              {submission.response_id}
            </p>
          </div>
          <div className="bg-white px-5 py-3.5 dark:bg-slate-950">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Submitted At</p>
            <p className="mt-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              {formatDateTime(submission.submitted_at)}
            </p>
          </div>
          <div className="bg-white px-5 py-3.5 dark:bg-slate-950">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Answers</p>
            <p className="mt-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              {submission.answers?.length || 0} field{submission.answers?.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Answers scroll area */}
        <div
          className="modal-scroll-area flex-1 overflow-y-auto bg-orange-50/30 px-6 py-5 space-y-3 dark:bg-orange-950/10"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {submission.answers && submission.answers.length > 0 ? (
            submission.answers.map((answer, idx) => (
              <div
                key={answer.field_id || idx}
                className="rounded-xl border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/50 overflow-hidden"
              >
                <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    Q{idx + 1}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-[13px] flex-1 leading-snug">
                    {answer.field_label || `Field ${idx + 1}`}
                  </span>
                  <span className="shrink-0 inline-flex items-center rounded-md bg-brand-500/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-500 dark:bg-brand-500/10">
                    {fieldTypeLabel(answer.field_type)}
                  </span>
                </div>
                <div className="px-4 py-3.5 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300 break-words whitespace-pre-wrap">
                  {renderValue(answer, { onView: openFilePreview, onDownload: openFilePreview }, t)}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Inbox size={36} className="mb-3 opacity-40" />
              <p className="text-sm font-semibold">{t('responses.noAnswers')}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
              {timeAgo(submission.submitted_at)}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirmModal({ isOpen, onClose, onConfirm, isDeleting }) {
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape' && !isDeleting) onClose() }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, isDeleting])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
      style={{ background: 'rgba(2, 6, 23, 0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950 animate-modalIn">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/10">
          <Trash2 size={24} />
        </div>
        <h3 className="text-center text-lg font-bold text-slate-900 dark:text-white">
          Delete Response?
        </h3>
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          Are you sure you want to permanently delete this response?
        </p>
        <p className="mt-2 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
          This action cannot be undone, and the deleted response cannot be recovered.
        </p>
        
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 w-full sm:w-auto"
          >
            {isDeleting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Response'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}


/* ── Custom orange checkbox (checked = orange fill + white tick, indeterminate = orange fill + white square) ── */
function CustomCheckbox({ checked, indeterminate, onChange, inputRef }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      ref={inputRef}
      onClick={onChange}
      className="flex-shrink-0 h-4 w-4 rounded cursor-pointer select-none transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
      style={{
        background: checked || indeterminate ? '#f97316' : '#ffffff',
        border: checked || indeterminate ? '1.5px solid #f97316' : '1.5px solid #fdba74',
        boxShadow: checked || indeterminate ? '0 0 0 0px #f97316' : 'none',
      }}
    >
      {checked && !indeterminate && (
        /* White checkmark SVG */
        <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-[2px]">
          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {indeterminate && (
        /* White small square for indeterminate */
        <span className="flex items-center justify-center w-full h-full">
          <span style={{ display:'block', width:'7px', height:'2.5px', background:'white', borderRadius:'1px' }} />
        </span>
      )}
    </button>
  )
}


function BulkDeleteConfirmModal({ isOpen, onClose, onConfirm, isDeleting, count }) {
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape' && !isDeleting) onClose() }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, isDeleting])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
      style={{ background: 'rgba(2, 6, 23, 0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950 animate-modalIn">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/10">
          <Trash2 size={24} />
        </div>
        <h3 className="text-center text-lg font-bold text-slate-900 dark:text-white">
          Delete {count} selected response{count !== 1 ? 's' : ''}?
        </h3>
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          Are you sure you want to permanently delete these responses?
        </p>
        <p className="mt-2 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
          This action cannot be undone.
        </p>
        
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 w-full sm:w-auto"
          >
            {isDeleting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}



export default function ResponsesPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [forms, setForms] = useState([])
  const [selectedFormId, setSelectedFormId] = useState('')
  const [formVersions, setFormVersions] = useState([])
  const [selectedVersionId, setSelectedVersionId] = useState('')
  const [selectedVersionDetail, setSelectedVersionDetail] = useState(null)
  const [responsesData, setResponsesData] = useState(null)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loadingForms, setLoadingForms] = useState(true)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [loadingResponses, setLoadingResponses] = useState(false)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [activeView, setActiveView] = useState(() => {
    const view = searchParams.get('view')
    return view === 'analytics' ? 'analytics' : 'responses'
  })
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [isFilterExpanded, setIsFilterExpanded] = useState(false)
  const [filterFieldId, setFilterFieldId] = useState('')
  const [filterFieldValue, setFilterFieldValue] = useState('')
  const [appliedFilterFieldId, setAppliedFilterFieldId] = useState('')
  const [appliedFilterFieldValue, setAppliedFilterFieldValue] = useState('')
  const [modalSubmission, setModalSubmission] = useState(null)
  const [deleteModalSubmission, setDeleteModalSubmission] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [datePreset, setDatePreset] = useState('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')
  const [copiedResponseId, setCopiedResponseId] = useState(null)
  const [previewFile, setPreviewFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewKind, setPreviewKind] = useState('image')
  const [previewText, setPreviewText] = useState('')
  const [previewZoom, setPreviewZoom] = useState(1)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [exportLoadingFormat, setExportLoadingFormat] = useState(null)
  const [toast, setToast] = useState(null)
  const exportMenuRef = useRef(null)

  // Selection states
  const [selectedResponseIds, setSelectedResponseIds] = useState([])
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const selectAllRef = useRef(null)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const itemsPerPageOptions = [10, 25, 50, 100]

  // Clear selection on page, form, or filter changes
  useEffect(() => {
    setSelectedResponseIds([])
  }, [
    selectedFormId,
    selectedVersionId,
    currentPage,
    itemsPerPage,
    search,
    datePreset,
    customStartDate,
    customEndDate,
    sortOrder,
    appliedFilterFieldId,
    appliedFilterFieldValue,
  ])


  useEffect(() => {
    if (!toast) return undefined
    const timeoutId = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  useEffect(() => {
    if (!exportMenuOpen) return undefined

    const handlePointerDown = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportMenuOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setExportMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [exportMenuOpen])

  useEffect(() => {
    let cancelled = false

    const loadForms = async () => {
      try {
        setLoadingForms(true)
        const res = await api.get('/forms')
        if (cancelled) return
        const items = res.data.items || []
        setForms(items)
        const preferredForm = items.find((form) => form.status === 'published') || items[0]
        if (preferredForm) {
          setSelectedFormId((current) => current || preferredForm.id)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.detail || 'Failed to load forms')
        }
      } finally {
        if (!cancelled) setLoadingForms(false)
      }
    }

    loadForms()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedFormId) {
      setFormVersions([])
      setSelectedVersionId('')
      setResponsesData(null)
      return
    }

    setFormVersions([])
    setSelectedVersionId('')
    setResponsesData(null)
    setModalSubmission(null)

    let cancelled = false

    const loadVersions = async () => {
      try {
        setLoadingVersions(true)
        setError(null)
        const res = await api.get(`/forms/${selectedFormId}/versions`)
        if (cancelled) return

        const items = res.data.items || []
        setFormVersions(items)
        const publishedItems = items.filter((version) => version.status === 'published')

        const preferredVersion =
          items.find((version) => version.id === res.data.current_version_id) ||
          publishedItems[0] ||
          null

        setSelectedVersionId(preferredVersion?.id || '')
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.detail || 'Failed to load version history')
          setFormVersions([])
          setSelectedVersionId('')
          setResponsesData(null)
        }
      } finally {
        if (!cancelled) setLoadingVersions(false)
      }
    }

    loadVersions()
    return () => {
      cancelled = true
    }
  }, [selectedFormId])

  useEffect(() => {
    if (!selectedFormId || !selectedVersionId) {
      setSelectedVersionDetail(null)
      setResponsesData(null)
      return
    }

    let cancelled = false

    const loadResponses = async () => {
      try {
        setLoadingResponses(true)
        setError(null)
        const res = await fetchFormResponses(selectedFormId, selectedVersionId, currentPage, itemsPerPage, appliedFilterFieldId, appliedFilterFieldValue)
        if (!cancelled) {
          setResponsesData(res)
          setModalSubmission(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.detail || 'Failed to load responses')
          setResponsesData(null)
        }
      } finally {
        if (!cancelled) setLoadingResponses(false)
      }
    }

    loadResponses()
    return () => {
      cancelled = true
    }
  }, [selectedFormId, selectedVersionId, currentPage, itemsPerPage, appliedFilterFieldId, appliedFilterFieldValue])

  useEffect(() => {
    if (!selectedFormId || !selectedVersionId) {
      setSelectedVersionDetail(null)
      return undefined
    }

    let cancelled = false

    const loadSelectedVersionDetail = async () => {
      try {
        const res = await api.get(`/forms/${selectedFormId}/versions/${selectedVersionId}`)
        if (!cancelled) {
          setSelectedVersionDetail(res.data)
        }
      } catch (err) {
        if (!cancelled) {
          setSelectedVersionDetail(null)
        }
      }
    }

    loadSelectedVersionDetail()
    return () => {
      cancelled = true
    }
  }, [selectedFormId, selectedVersionId])

  useEffect(() => {
    if (!selectedFormId || !selectedVersionId) {
      setAnalyticsData(null)
      return
    }

    let cancelled = false

    const loadAnalytics = async () => {
      try {
        setLoadingAnalytics(true)
        const res = await api.get(`/forms/${selectedFormId}/analytics`, {
          params: { version_id: selectedVersionId }
        })
        if (!cancelled) {
          setAnalyticsData(res.data)
        }
      } catch (err) {
        console.error("Failed to load analytics", err)
        if (!cancelled) {
          setAnalyticsData(null)
        }
      } finally {
        if (!cancelled) setLoadingAnalytics(false)
      }
    }

    loadAnalytics()
    return () => {
      cancelled = true
    }
  }, [selectedFormId, selectedVersionId])

  // Reset pagination on filter or selection change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, datePreset, customStartDate, customEndDate, sortOrder, selectedFormId, selectedVersionId, appliedFilterFieldId, appliedFilterFieldValue])

  useEffect(() => {
    setExportMenuOpen(false)
  }, [selectedFormId, selectedVersionId])

  useEffect(() => {
    setFilterFieldId('')
    setFilterFieldValue('')
    setAppliedFilterFieldId('')
    setAppliedFilterFieldValue('')
    setIsFilterExpanded(false)
  }, [selectedFormId, selectedVersionId])

  const publishedVersions = useMemo(
    () => formVersions.filter((version) => version.status === 'published'),
    [formVersions]
  )

  const selectedForm = forms.find((form) => form.id === selectedFormId)
  const selectedVersion = publishedVersions.find((version) => version.id === selectedVersionId)

  const filterableFields = useMemo(() => {
    const sections = selectedVersionDetail?.snapshot?.sections?.length
      ? selectedVersionDetail.snapshot.sections
      : selectedForm?.sections

    if (!sections) return []
    const choiceTypes = ['dropdown', 'radio', 'checkbox']
    const fields = []
    for (const section of sections) {
      for (const field of section.fields || []) {
        const isChoiceField = choiceTypes.includes(field.field_type)
        const isRatingField = field.field_type === 'rating'
        if (isChoiceField && Array.isArray(field.options) && field.options.length > 0) {
          fields.push({
            fieldId: String(field.id),
            fieldLabel: field.label,
            fieldType: field.field_type,
            options: field.options,
          })
        } else if (isRatingField) {
          const maxStars = Number(field.config?.max_stars || 5)
          fields.push({
            fieldId: String(field.id),
            fieldLabel: field.label,
            fieldType: field.field_type,
            options: Array.from({ length: maxStars }, (_, index) => {
              const value = String(index + 1)
              return {
                label: value,
                option_value: value,
              }
            }),
          })
        }
      }
    }
    return fields
  }, [selectedForm, selectedVersionDetail])

  const selectedFieldOptions = useMemo(() => {
    if (!filterFieldId || filterableFields.length === 0) return []
    const field = filterableFields.find(f => f.fieldId === filterFieldId)
    if (!field || !field.options) return []
    return field.options.map(opt => ({
      option: opt.label,
      optionValue: opt.option_value,
    }))
  }, [filterFieldId, filterableFields])

  const filteredResponses = useMemo(() => {
    const items = responsesData?.responses || []
    const query = search.trim().toLowerCase()
    const { start, end } = getDateRangeBounds(datePreset, customStartDate, customEndDate)

    let filtered = items.filter((submission) => {
      const submittedAtMs = submission.submitted_at ? new Date(submission.submitted_at).getTime() : null
      if (submittedAtMs !== null && Number.isNaN(submittedAtMs)) return false

      if (start !== null && submittedAtMs !== null && submittedAtMs < start) return false
      if (end !== null && submittedAtMs !== null && submittedAtMs > end) return false

      if (!query) return true
      return getSubmissionSearchText(submission).includes(query)
    })

    filtered = [...filtered].sort((a, b) => {
      const aTime = new Date(a.submitted_at || 0).getTime()
      const bTime = new Date(b.submitted_at || 0).getTime()
      return sortOrder === 'oldest' ? aTime - bTime : bTime - aTime
    })

    return filtered
  }, [responsesData, search, datePreset, customStartDate, customEndDate, sortOrder])

  // Get pagination info from backend or calculate from filtered responses
  const totalResponses = responsesData?.total_responses || filteredResponses.length
  const totalPages = responsesData?.total_pages || Math.ceil(filteredResponses.length / itemsPerPage) || 1


  const handleDeleteResponse = async () => {
    if (!deleteModalSubmission) return

    try {
      setIsDeleting(true)
      await deleteFormResponse(selectedFormId, deleteModalSubmission.response_id)
      
      // Update local state without refreshing
      setResponsesData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          total_responses: Math.max(0, prev.total_responses - 1),
          responses: prev.responses.filter(r => r.response_id !== deleteModalSubmission.response_id)
        }
      })
      
      setToast({ type: 'success', message: 'Response deleted successfully.' })
      setDeleteModalSubmission(null)
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.detail || err.message || 'Failed to delete response' })
    } finally {
      setIsDeleting(false)
    }
  }

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, filteredResponses.length)
  const paginatedResponses = useMemo(() => {
    return filteredResponses.slice(startIndex, endIndex)
  }, [filteredResponses, startIndex, endIndex])

  const isAllSelected = paginatedResponses.length > 0 && paginatedResponses.every(r => selectedResponseIds.includes(r.response_id))

  useEffect(() => {
    if (selectAllRef.current) {
      const selectedCount = paginatedResponses.filter(r => selectedResponseIds.includes(r.response_id)).length
      selectAllRef.current.indeterminate = selectedCount > 0 && selectedCount < paginatedResponses.length
    }
  }, [selectedResponseIds, paginatedResponses])

  const handleSelectAllChange = () => {
    if (isAllSelected) {
      setSelectedResponseIds(prev => prev.filter(id => !paginatedResponses.some(r => r.response_id === id)))
    } else {
      const pageIds = paginatedResponses.map(r => r.response_id)
      setSelectedResponseIds(prev => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  const handleCheckboxChange = (responseId) => {
    setSelectedResponseIds(prev =>
      prev.includes(responseId)
        ? prev.filter(id => id !== responseId)
        : [...prev, responseId]
    )
  }

  const handleBulkDelete = async () => {
    if (selectedResponseIds.length === 0) return

    try {
      setIsBulkDeleting(true)
      await deleteFormResponsesBulk(selectedFormId, selectedResponseIds)

      setResponsesData(prev => {
        if (!prev) return prev
        const remainingResponses = prev.responses.filter(r => !selectedResponseIds.includes(r.response_id))
        return {
          ...prev,
          total_responses: Math.max(0, prev.total_responses - selectedResponseIds.length),
          responses: remainingResponses
        }
      })

      setToast({ type: 'success', message: `${selectedResponseIds.length} responses deleted successfully.` })
      setSelectedResponseIds([])
      setIsBulkDeleteModalOpen(false)
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.detail || err.message || 'Failed to delete responses' })
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const latestSubmission = responsesData?.latest_submission || null

  const responsesAvailable = totalResponses > 0
  const hasFilters = Boolean(search.trim()) || datePreset !== 'all' || sortOrder !== 'newest' || Boolean(appliedFilterFieldId) || Boolean(appliedFilterFieldValue)
  const canClearFilters = hasFilters || customStartDate || customEndDate
  const exportButtonDisabled =
    !selectedFormId ||
    !selectedVersionId ||
    loadingForms ||
    loadingVersions ||
    loadingResponses ||
    Boolean(exportLoadingFormat)

  const showToast = (type, message) => {
    setToast({ type, message })
  }

  const handleItemsPerPageChange = (newPageSize) => {
    setItemsPerPage(newPageSize)
    setCurrentPage(1)  // Reset to first page when changing page size
  }

  const triggerBlobDownload = (blob, filename) => {
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }

  const handleExport = async (format) => {
    if (exportLoadingFormat) return

    if (!responsesAvailable) {
      setExportMenuOpen(false)
      showToast('error', t('responses.noResponsesAvailable'))
      return
    }

    setExportMenuOpen(false)
    setExportLoadingFormat(format)

    try {
      const result = await exportFormResponses({
        formId: selectedFormId,
        format,
        formVersionId: selectedVersionId,
        fallbackFilenameBase: selectedForm?.title || 'form',
      })
      triggerBlobDownload(result.blob, result.filename)
      showToast('success', `${result.filename} ${t('responses.exportStarted')}`)
    } catch (err) {
      showToast('error', err?.message || t('responses.failedToExport'))
    } finally {
      setExportLoadingFormat(null)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setDatePreset('all')
    setCustomStartDate('')
    setCustomEndDate('')
    setSortOrder('newest')
    setFilterFieldId('')
    setFilterFieldValue('')
    setAppliedFilterFieldId('')
    setAppliedFilterFieldValue('')
  }

  const handleCopyResponseId = async (responseId) => {
    try {
      await navigator.clipboard.writeText(String(responseId))
      setCopiedResponseId(responseId)
      window.setTimeout(() => {
        setCopiedResponseId((current) => (current === responseId ? null : current))
      }, 1500)
    } catch {
      setCopiedResponseId(null)
    }
  }

  const closePreview = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewFile(null)
    setPreviewUrl('')
    setPreviewKind('image')
    setPreviewText('')
    setPreviewZoom(1)
    setPreviewLoading(false)
  }

  const openFilePreview = async (file, action = 'view') => {
    if (!file) return
    const kind = getPreviewKind(file)

    setPreviewLoading(true)
    try {
      const isUnsupported = kind === 'unsupported'
      const shouldDownload = action === 'download' || isUnsupported
      const response = await getAdminFileDownloadUrl(file.file_key, 600, shouldDownload)
      const signedUrl = response?.signed_download_url || response?.signedDownloadUrl || response?.signedUrl || response?.signedURL || ''
      if (!signedUrl) {
        throw new Error('Preview URL unavailable')
      }

      window.open(signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('File view error', err)
      alert(err.message || 'Failed to open file')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleAnalyticsChartClick = ({ fieldId, fieldLabel, fieldValue, fieldType }) => {
    setActiveView('responses')
    setIsFilterExpanded(true)
    setFilterFieldId(fieldId)
    setFilterFieldValue(fieldValue)
    setAppliedFilterFieldId(fieldId)
    setAppliedFilterFieldValue(fieldValue)
    setCurrentPage(1)
  }

  return (
    <DashboardShell
      title={t('responses.title')}
      subtitle={t('responses.subtitle')}
      action={
        <div className="flex items-center gap-3">
          {selectedResponseIds.length > 0 && (
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="inline-flex h-10 items-center justify-center rounded-full bg-red-600 px-5 text-xs font-semibold text-white shadow-lg transition duration-200 hover:bg-red-700 active:scale-95 dark:bg-red-700 dark:hover:bg-red-800"
            >
              <Trash2 size={14} className="mr-2" />
              Bulk Delete ({selectedResponseIds.length})
            </button>
          )}

          <div ref={exportMenuRef} className="relative">
            <button
              type="button"
              disabled={exportButtonDisabled}
              onClick={() => setExportMenuOpen((current) => !current)}
              className="inline-flex h-10 items-center justify-center rounded-full bg-brand-500 px-5 text-xs font-semibold text-white shadow-lg transition duration-200 hover:bg-orange-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand-500 dark:hover:bg-orange-600"
            >
              {exportLoadingFormat ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Download size={14} className="mr-2" />}
              {exportLoadingFormat ? t('messages.saving') : t('common.export')}
              <ChevronDown size={13} className="ml-1.5 opacity-90" />
            </button>


          {exportMenuOpen && !exportButtonDisabled && (
            <div className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
              {!responsesAvailable ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  {t('responses.noResponsesAvailable')}
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={Boolean(exportLoadingFormat)}
                    onClick={() => handleExport('csv')}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    <span className="flex items-center gap-2">
                      {exportLoadingFormat === 'csv' ? <Loader2 size={14} className="animate-spin text-brand-500" /> : <FileSpreadsheet size={14} className="text-brand-500" />}
                      {t('responses.exportCsv')}
                    </span>
                    {exportLoadingFormat === 'csv' && <span className="text-[10px] font-medium text-slate-400">{t('messages.saving')}</span>}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(exportLoadingFormat)}
                    onClick={() => handleExport('json')}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      <span className="flex items-center gap-2">
                        {exportLoadingFormat === 'json' ? <Loader2 size={14} className="animate-spin text-brand-500" /> : <FileText size={14} className="text-brand-500" />}
                      {t('responses.exportJson')}
                      </span>
                      {exportLoadingFormat === 'json' && <span className="text-[10px] font-medium text-slate-400">{t('messages.saving')}</span>}
                    </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    }

    >
      {/* Top Layout Grid: Left Stats (2 cards), Right Config Panel */}
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* Left Side: Stats Cards (2 cards) */}
        <div className="col-span-12 lg:col-span-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
            <SummaryCard
              label={t('responses.totalResponses')}
              value={totalResponses}
              subtext={selectedForm ? selectedForm.title : t('responses.noFormSelected')}
              icon={FileText}
              badge={selectedVersion && (
                <div className="inline-flex items-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Version
                  </span>
                  <span className="inline-flex items-center rounded-md bg-orange-100 px-1.5 py-0.5 text-[11px] font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                    V{selectedVersion.version_number}
                  </span>
                </div>
              )}
              footer={selectedForm?.status === 'published' ? t('responses.acceptingResponses') : t('responses.editingState')}
            />
            <SummaryCard
              label={t('responses.formStatus')}
              value={
                selectedForm ? (
                  <div className="flex flex-col gap-2 items-start mt-1">
                    <StatusBadge status={selectedForm.status} />
                    {selectedForm.status !== 'draft' && getCollectionStatus(selectedForm) !== 'accepting' && (
                      <StatusBadge status={getCollectionStatus(selectedForm)} />
                    )}
                  </div>
                ) : (
                  t('responses.noActiveForm')
                )
              }
              subtext={selectedForm?.status === 'published' ? t('responses.acceptingResponses') : t('responses.editingState')}
              icon={ArrowDownUp}
              badge={selectedVersion && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
                  {selectedForm?.status === 'published' ? 'Published' : 'Draft'}
                </span>
              )}
              lastUpdated={selectedVersion && `Updated ${timeAgo(selectedVersion.published_at)}`}
            />
          </div>
        </div>

        {/* Right Side: Configuration Panel */}
        <div className="col-span-12 lg:col-span-7">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-soft h-full flex flex-col gap-3">
            
            {/* Row 1: Form & Version Selectors */}
            <div className="grid grid-cols-2 gap-3">
              {/* Select Form */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                  {t('responses.selectFormLabel')}
                </label>
                <div className="relative">
                  <select
                    value={selectedFormId}
                    onChange={(e) => setSelectedFormId(e.target.value)}
                    className="w-full h-9 appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {forms.length === 0 ? (
                      <option value="">{t('responses.noFormAvailable')}</option>
                    ) : (
                      forms.map((form) => (
                        <option key={form.id} value={form.id}>
                          {form.title}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Select Version */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                  {t('responses.selectVersionLabel')}
                </label>
                <div className="relative">
                  <select
                    value={selectedVersionId}
                    onChange={(e) => setSelectedVersionId(e.target.value)}
                    disabled={publishedVersions.length === 0}
                    className="w-full h-9 appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {publishedVersions.length === 0 ? (
                      <option value="">{t('responses.noPublishedVersions')}</option>
                    ) : (
                      publishedVersions.map((version) => (
                        <option key={version.id} value={version.id}>
                          Version {version.version_number}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Row 2: View Toggle */}
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                {t('responses.viewToggleLabel')}
              </label>
              <div className="relative flex p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/40 rounded-xl w-full h-9 items-center">
                {/* Sliding background indicator */}
                <div
                  className="absolute top-1 bottom-1 rounded-lg bg-brand-500 shadow-sm transition-all duration-300 ease-out"
                  style={{
                    width: 'calc(50% - 4px)',
                    left: activeView === 'responses' ? '4px' : 'calc(50%)',
                  }}
                />
                
                <button
                  type="button"
                  onClick={() => setActiveView('responses')}
                  className={`relative z-10 flex-1 flex items-center justify-center h-full text-xs font-bold rounded-lg transition-colors duration-250 ${
                    activeView === 'responses'
                      ? 'text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t('responses.viewResponses')}
                </button>
                
                <button
                  type="button"
                  onClick={() => setActiveView('analytics')}
                  className={`relative z-10 flex-1 flex items-center justify-center h-full text-xs font-bold rounded-lg transition-colors duration-250 ${
                    activeView === 'analytics'
                      ? 'text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t('responses.viewAnalytics')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeView === 'responses' && (
        <>
          {/* Filter Bar Toolbar */}
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2 shadow-sm">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('responses.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 bg-transparent pl-9 pr-3 text-xs text-slate-700 dark:text-slate-300 outline-none placeholder-slate-400"
              />
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

            {/* Date Selector */}
            <div className="relative">
              <CalendarDays size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                className="h-9 appearance-none bg-transparent pl-8 pr-7 text-xs font-semibold text-slate-600 dark:text-slate-400 outline-none cursor-pointer"
              >
                <option value="all">{t('responses.allTime')}</option>
                <option value="today">{t('responses.today')}</option>
                <option value="yesterday">{t('responses.yesterday')}</option>
                <option value="last7">{t('responses.last7Days')}</option>
                <option value="last30">{t('responses.last30Days')}</option>
                <option value="custom">{t('responses.custom')}</option>
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-450" />
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

            {/* Sort Selector */}
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="h-9 appearance-none bg-transparent pl-3 pr-7 text-xs font-semibold text-slate-600 dark:text-slate-400 outline-none cursor-pointer"
              >
                <option value="newest">{t('responses.newestFirst')}</option>
                <option value="oldest">{t('responses.oldestFirst')}</option>
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

            {/* Filters Toggle */}
            <button
              type="button"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={`inline-flex h-9 items-center justify-center gap-1.5 px-3 text-xs font-semibold transition rounded-lg ${
                isFilterExpanded || appliedFilterFieldId 
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' 
                  : 'bg-transparent text-slate-600 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-300'
              }`}
            >
              <Filter size={12} />
              {t('responses.filter')}
              {(appliedFilterFieldId) && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-100 text-[9px] text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                  1
                </span>
              )}
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

            {/* Clear Button */}
            <button
              type="button"
              onClick={clearFilters}
              disabled={!canClearFilters}
              className="h-9 inline-flex items-center justify-center px-3 text-xs font-semibold text-brand-500 hover:text-brand-650 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('responses.clear')}
            </button>
          </div>

          {/* Custom Date Range Panel */}
          {datePreset === 'custom' && (
            <div className="mb-5 grid gap-4 md:grid-cols-2 p-3.5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/30 animate-fadeIn">
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {t('responses.startDate')}
                </span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {t('responses.endDate')}
                </span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                />
              </label>
            </div>
          )}

          {/* Filter Panel */}
          {isFilterExpanded && (
            <div className="mb-5 p-4 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-fadeIn">
              <div className="flex items-center gap-2 mb-3">
                <Filter size={14} className="text-brand-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Filter Responses
                </h4>
              </div>
              
              {filterableFields.length === 0 ? (
                <div className="py-6 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                  {t('responses.noFilterableFields', 'This form does not contain any filterable fields.')}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-end gap-3">
                  <div className="flex-1 w-full">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                      Select Field
                    </label>
                    <div className="relative">
                      <select
                        value={filterFieldId}
                        onChange={(e) => {
                          setFilterFieldId(e.target.value)
                          setFilterFieldValue('')
                        }}
                        className="w-full h-9 appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                      >
                        <option value="">-- Choose Field --</option>
                        {filterableFields.map((f) => (
                          <option key={f.fieldId} value={f.fieldId}>{f.fieldLabel}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="flex-1 w-full">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                      Select Value
                    </label>
                    <div className="relative">
                      <select
                        value={filterFieldValue}
                        onChange={(e) => setFilterFieldValue(e.target.value)}
                        disabled={!filterFieldId}
                        className="w-full h-9 appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                      >
                        <option value="">-- Choose Value --</option>
                        {selectedFieldOptions.map((opt) => (
                          <option key={opt.optionValue} value={opt.optionValue}>{opt.option}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedFilterFieldId(filterFieldId)
                        setAppliedFilterFieldValue(filterFieldValue)
                      }}
                      disabled={!filterFieldId || !filterFieldValue}
                      className="h-9 inline-flex flex-1 sm:flex-none items-center justify-center rounded-lg bg-brand-500 px-4 text-xs font-semibold text-white shadow-sm transition duration-200 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Apply Filter
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterFieldId('')
                        setFilterFieldValue('')
                        setAppliedFilterFieldId('')
                        setAppliedFilterFieldValue('')
                      }}
                      disabled={!filterFieldId && !appliedFilterFieldId}
                      className="h-9 inline-flex flex-1 sm:flex-none items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
              
              {appliedFilterFieldId && appliedFilterFieldValue && (
                <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Filter:</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 pl-2.5 pr-1.5 py-1 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 border border-brand-100 dark:border-brand-500/20">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      {filterableFields.find(f => f.fieldId === appliedFilterFieldId)?.fieldLabel}:
                    </span>
                    {filterableFields.find(f => f.fieldId === appliedFilterFieldId)?.options?.find(o => o.option_value === appliedFilterFieldValue)?.label || appliedFilterFieldValue}
                    <button
                      type="button"
                      onClick={() => {
                        setFilterFieldId('')
                        setFilterFieldValue('')
                        setAppliedFilterFieldId('')
                        setAppliedFilterFieldValue('')
                      }}
                      className="ml-1 rounded-full p-0.5 hover:bg-brand-200 dark:hover:bg-brand-500/30 transition text-brand-500 dark:text-brand-400"
                    >
                      <X size={12} />
                    </button>
                  </span>
                  <span className="ml-auto text-[10px] font-semibold text-slate-400">
                    {totalResponses} matching response{totalResponses !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Content Area */}
      {loadingForms || loadingVersions || (activeView === 'responses' && loadingResponses) ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="border border-slate-200 bg-slate-50 p-4 rounded-xl text-slate-700 dark:border-slate-850 dark:bg-slate-900 dark:text-slate-300 text-xs">
          {error}
        </div>
      ) : !selectedFormId ? (
        <EmptyResponsesState t={t} />
      ) : !selectedVersionId ? (
        <Card className="p-8 text-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
          {t('responses.noPublishedVersionsText')}
        </Card>
      ) : activeView === 'analytics' ? (
        loadingAnalytics ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center animate-fadeIn">
            <Loader2 size={36} className="animate-spin text-brand-500" />
            <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {t('responses.gatheringAnalytics')}
            </p>
          </div>
        ) : !analyticsData || !analyticsData.fields || analyticsData.fields.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center border border-slate-200 dark:border-slate-800 shadow-soft animate-fadeIn">
            <BarChart3 size={42} className="text-slate-350 dark:text-slate-700" />
            <h3 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">{t('responses.noAnalyticsAvailable')}</h3>
            <p className="mt-1.5 max-w-md text-sm text-slate-400">
              {t('responses.noSupportedFieldsOrResponses')} {selectedVersion?.version_number || ''}.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
            {/* Trend Chart - spans 2 columns on desktop, full width on smaller screens */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-2">
              <ResponseTrendChart 
                responses={responsesData?.responses || []} 
                selectedVersion={selectedVersion}
                t={t}
              />
            </div>

            {/* Analytics Cards - First card takes remaining column on desktop */}
            {analyticsData.fields.map((field, index) => (
              <div key={field.fieldId} className={index === 0 ? 'col-span-1' : 'col-span-1'}>
                <AnalyticsChartCard field={field} t={t} onValueClick={handleAnalyticsChartClick} />
              </div>
            ))}
          </div>
        )
      ) : !responsesAvailable && !hasFilters ? (
        <EmptyResponsesState t={t} />
      ) : filteredResponses.length === 0 || (hasFilters && !responsesAvailable) ? (
        <NoMatchState t={t} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-fadeIn">
          {/* Table Header */}
          <div className="hidden border-b border-slate-200 bg-slate-50/50 px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:border-slate-800 dark:bg-slate-950/40 md:flex md:items-center gap-4">
            <div className="flex items-center justify-center w-5 flex-shrink-0">
              <CustomCheckbox
                checked={isAllSelected}
                indeterminate={!isAllSelected && selectedResponseIds.length > 0}
                onChange={handleSelectAllChange}
                inputRef={selectAllRef}
              />
            </div>
            <div className="grid md:grid-cols-[50px_2.2fr_1.5fr_1fr_1.2fr] gap-4 items-center flex-1">
              <span className="text-center">#</span>
              <span>{t('responses.responseId')}</span>
              <span>{t('responses.submittedAt')}</span>
              <span>{t('responses.answers')}</span>
              <span className="text-right">{t('responses.action')}</span>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedResponses.map((submission, index) => {
              return (
                <div
                  key={submission.response_id}
                  className="transition-colors duration-150 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                >
                  {/* Main Row */}
                  <div className="flex gap-4 px-6 py-2.5 items-center">
                    {/* Checkbox Column */}
                    <div className="flex items-center justify-center w-5 flex-shrink-0">
                      <CustomCheckbox
                        checked={selectedResponseIds.includes(submission.response_id)}
                        indeterminate={false}
                        onChange={() => handleCheckboxChange(submission.response_id)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[50px_2.2fr_1.5fr_1fr_1.2fr] gap-4 items-center flex-1 min-w-0">
                      {/* Index Column */}
                      <div className="text-center font-semibold text-slate-400 text-xs hidden md:block">
                        {startIndex + index + 1}
                      </div>

                      {/* Response ID Column */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 text-xs truncate max-w-[200px] xl:max-w-xs" title={submission.response_id}>
                          {submission.response_id}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyResponseId(submission.response_id)}
                          className="text-slate-400 hover:text-brand-500 transition flex-shrink-0"
                          title="Copy ID"
                        >
                          {copiedResponseId === submission.response_id ? (
                            <Check size={13} className="text-brand-500" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>

                      {/* Submitted At Column */}
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 text-[13px] leading-snug">
                          {formatDateTime(submission.submitted_at)}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {timeAgo(submission.submitted_at)}
                        </span>
                      </div>

                      {/* Answers Column */}
                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-brand-500 border border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/30 dark:text-brand-400">
                          {submission.answers?.length || 0} {t('responses.answers')}
                        </span>
                      </div>

                      {/* Action Column */}
                      <div className="flex md:justify-end">
                        <div className="relative group/eye">
                          <button
                            type="button"
                            onClick={() => setModalSubmission(submission)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                            aria-label="View Response"
                          >
                            <Eye size={14} />
                          </button>
                          {/* Tooltip — rendered in normal flow above the button, overflow-visible */}
                          <div
                            className="pointer-events-none absolute left-1/2 bottom-[calc(100%+8px)] -translate-x-1/2 z-[200] whitespace-nowrap opacity-0 group-hover/eye:opacity-100 transition-opacity duration-150"
                          >
                            <div className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-xl dark:bg-slate-700">
                              View Response
                            </div>
                            <div className="mx-auto mt-0.5 h-1.5 w-1.5 rotate-45 bg-slate-900 dark:bg-slate-700" />
                          </div>
                        </div>

                        <div className="relative group/trash ml-2">
                          <button
                            type="button"
                            onClick={() => setDeleteModalSubmission(submission)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-red-400 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                            aria-label="Delete Response"
                          >
                            <Trash2 size={14} />
                          </button>
                          <div
                            className="pointer-events-none absolute left-1/2 bottom-[calc(100%+8px)] -translate-x-1/2 z-[200] whitespace-nowrap opacity-0 group-hover/trash:opacity-100 transition-opacity duration-150"
                          >
                            <div className="rounded-lg bg-red-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-xl dark:bg-red-700">
                              Delete Response
                            </div>
                            <div className="mx-auto mt-0.5 h-1.5 w-1.5 rotate-45 bg-red-600 dark:bg-red-700" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination Controls */}
          <div className="border-t border-slate-200/80 px-6 py-4 dark:border-slate-800">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              displayStart={filteredResponses.length > 0 ? startIndex + 1 : 0}
              displayEnd={endIndex}
              totalCount={filteredResponses.length}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={handleItemsPerPageChange}
              itemsPerPageOptions={itemsPerPageOptions}
              t={t}
            />
          </div>
        </div>
      )}

      {previewFile && (
        <FilePreviewModal
          file={{ ...previewFile, typeLabel: getFileMeta(previewFile).label }}
          previewUrl={previewUrl}
          previewKind={previewKind}
          previewText={previewText}
          zoom={previewZoom}
          loading={previewLoading}
          onClose={closePreview}
          onOpenInNewTab={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
          onZoomIn={() => setPreviewZoom((current) => Math.min(3, Number((current + 0.1).toFixed(2))))}
          onZoomOut={() => setPreviewZoom((current) => Math.max(0.5, Number((current - 0.1).toFixed(2))))}
          onZoomChange={setPreviewZoom}
        />
      )}
      {modalSubmission && (
        <ResponseDetailModal
          submission={modalSubmission}
          formName={selectedForm?.title}
          versionNumber={selectedVersion?.version_number}
          onClose={() => setModalSubmission(null)}
          openFilePreview={openFilePreview}
          t={t}
        />
      )}
      <DeleteConfirmModal
        isOpen={!!deleteModalSubmission}
        onClose={() => setDeleteModalSubmission(null)}
        onConfirm={handleDeleteResponse}
        isDeleting={isDeleting}
      />
      <BulkDeleteConfirmModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        isDeleting={isBulkDeleting}
        count={selectedResponseIds.length}
      />
      {toast && <PageToast toast={toast} t={t} />}
    </DashboardShell>
  )
}
