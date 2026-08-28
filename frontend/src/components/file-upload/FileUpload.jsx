import { useEffect, useMemo, useState } from 'react'
import { Controller } from 'react-hook-form'
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  FileArchive,
  FileText,
  FileSpreadsheet,
  Eye,
  ExternalLink,
  Loader2,
  Image as ImageIcon,
  RotateCcw,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useFileUpload } from '../../hooks/useFileUpload'

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function getFileMeta(item) {
  const name = String(item?.name || '').toLowerCase()
  const type = String(item?.type || item?.contentType || '').toLowerCase()
  if (type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name)) {
    return { icon: ImageIcon, label: 'Image', accent: 'text-emerald-500' }
  }
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return { icon: FileText, label: 'PDF', accent: 'text-rose-500' }
  }
  if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) {
    return { icon: FileText, label: 'Word', accent: 'text-blue-500' }
  }
  if (type.includes('excel') || type.includes('spreadsheet') || name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) {
    return { icon: FileSpreadsheet, label: 'Excel', accent: 'text-emerald-600' }
  }
  if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z') || name.endsWith('.tar') || name.endsWith('.gz')) {
    return { icon: FileArchive, label: 'Archive', accent: 'text-amber-500' }
  }
  if (type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md')) {
    return { icon: FileText, label: 'Text', accent: 'text-slate-500' }
  }
  return { icon: FileText, label: 'Document', accent: 'text-slate-500' }
}

function getPreviewKind(item) {
  const name = String(item?.name || '').toLowerCase()
  const type = String(item?.type || item?.contentType || '').toLowerCase()
  if (type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(name)) return 'image'
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (type.includes('word') || /\.(doc|docx)$/i.test(name)) return 'word'
  if (type.includes('excel') || type.includes('spreadsheet') || /\.(xls|xlsx)$/i.test(name)) return 'excel'
  if (type.startsWith('text/') || /\.(txt|md|csv)$/i.test(name)) return 'text'
  return 'unsupported'
}

function statusBadge(status) {
  if (status === 'success') {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  }
  if (status === 'error') {
    return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  }
  if (status === 'uploading') {
    return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
  }
  if (status === 'cancelled') {
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  }
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
}

function previewButtonLabel(kind) {
  if (kind === 'word' || kind === 'excel') return 'Preview'
  if (kind === 'image' || kind === 'pdf' || kind === 'text') return 'Preview'
  return 'Preview not available'
}

function PreviewModal({
  item,
  previewUrl,
  previewText,
  previewKind,
  zoom,
  onClose,
  onZoomIn,
  onZoomOut,
  onZoomChange,
  onOpenInNewTab,
  loading,
}) {
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

  if (!item) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Preview</p>
            <h3 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{item.name}</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.sizeLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {(previewKind === 'image' || previewKind === 'text') && (
              <>
                <button
                  type="button"
                  onClick={onZoomOut}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-orange-300 hover:text-orange-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  title="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onZoomIn}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-orange-300 hover:text-orange-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  title="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  Zoom
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
              Open
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              title="Close preview"
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
                Loading preview...
              </div>
            </div>
          ) : previewKind === 'image' && previewUrl ? (
            <div className="flex h-full items-center justify-center overflow-auto p-6">
              <img
                src={previewUrl}
                alt={item.name}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center top' }}
                className="max-h-none max-w-none rounded-2xl bg-white shadow-2xl"
              />
            </div>
          ) : previewKind === 'pdf' && previewUrl ? (
            <iframe
              title={item.name}
              src={previewUrl}
              className="h-full w-full border-0 bg-white"
            />
          ) : previewKind === 'text' ? (
            <div className="h-full overflow-auto p-6">
              <pre
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                className="min-h-full whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-white p-5 font-mono text-sm leading-6 text-slate-800 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              >
                {previewText || 'No text preview available.'}
              </pre>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Preview not available
                </p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  This file type cannot be previewed inline.
                </p>
                <button
                  type="button"
                  onClick={onOpenInNewTab}
                  disabled={!previewUrl}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open file
                </button>
              </div>
            </div>
          )}
        </div>

        {(previewKind === 'image' || previewKind === 'text') && (
          <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Zoom: {Math.round(zoom * 100)}%
            {previewKind === 'text' && ' | use the zoom buttons for readability'}
          </div>
        )}
      </div>
    </div>
  )
}

function FileUploadView({
  field,
  value,
  onChange,
  linkToken,
  scope = 'public',
  disabled = false,
  className = '',
  control,
  name,
  externalErrors = [],
}) {
  const upload = useFileUpload({
    field,
    linkToken,
    value,
    onChange,
    scope,
    disabled,
  })

  const {
    items,
    selectionErrors,
    isDragging,
    maxReached,
    maxCountMessage,
    inputRef,
    accept,
    openPicker,
    handleInputChange,
    handleDrop,
    setIsDragging,
    removeItem,
    cancelUpload,
    retryUpload,
    isMultiple,
    rules,
  } = upload
  const [previewItem, setPreviewItem] = useState(null)
  const [previewKind, setPreviewKind] = useState('image')
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [previewZoom, setPreviewZoom] = useState(1)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')

  const helpText = useMemo(() => {
    const hints = []
    if (rules.allowed_file_types?.length) {
      hints.push(`Types: ${rules.allowed_file_types.join(', ')}`)
    }
    if (rules.allowed_extensions?.length) {
      hints.push(`Extensions: ${rules.allowed_extensions.map((ext) => `.${String(ext).replace(/^\./, '')}`).join(', ')}`)
    }
    if (rules.min_file_size_mb) {
      hints.push(`Min size: ${rules.min_file_size_mb} MB`)
    }
    if (rules.max_file_size_mb) {
      hints.push(`Max size: ${rules.max_file_size_mb} MB`)
    }
    if (rules.max_file_count) {
      hints.push(`Max files: ${rules.max_file_count}`)
    }
    return hints
  }, [rules])

  const closePreview = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewItem(null)
    setPreviewKind('image')
    setPreviewUrl('')
    setPreviewText('')
    setPreviewZoom(1)
    setPreviewLoading(false)
    setPreviewError('')
  }

  const handlePreview = async (item) => {
    if (!item || item.status !== 'success') return

    const kind = getPreviewKind(item)
    if (kind === 'unsupported') return

    setPreviewError('')
    setPreviewLoading(true)

    try {
      const popup = kind === 'word' || kind === 'excel' ? window.open('', '_blank', 'noopener,noreferrer') : null
      const signedUrl = await upload.fetchPreviewUrl(item)
      if (!signedUrl) {
        throw new Error('Unable to load preview URL')
      }

      if (kind === 'word' || kind === 'excel') {
        if (popup) {
          popup.location.href = signedUrl
        } else {
          window.open(signedUrl, '_blank', 'noopener,noreferrer')
        }
        return
      }

      if (kind === 'pdf') {
        const response = await fetch(signedUrl)
        if (!response.ok) {
          throw new Error('Unable to load PDF preview')
        }
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)
        setPreviewItem(item)
        setPreviewKind(kind)
        setPreviewUrl(blobUrl)
        setPreviewText('')
        setPreviewZoom(1)
        return
      }

      if (kind === 'text') {
        const response = await fetch(signedUrl)
        if (!response.ok) {
          throw new Error('Unable to load text preview')
        }
        const text = await response.text()
        setPreviewItem(item)
        setPreviewKind(kind)
        setPreviewUrl(signedUrl)
        setPreviewText(text)
        setPreviewZoom(1)
        return
      }

      setPreviewItem(item)
      setPreviewKind(kind)
      setPreviewUrl(signedUrl)
      setPreviewText('')
      setPreviewZoom(1)
    } catch (error) {
      setPreviewError(error?.message || 'Preview failed')
      setSelectionErrors([error?.message || 'Preview failed'])
    } finally {
      setPreviewLoading(false)
    }
  }

  const containerClasses =
    'rounded-2xl border border-slate-200 bg-white p-4 transition dark:border-slate-800 dark:bg-slate-900'
  const uploadDisabled = disabled || maxReached
  const isPreviewOpen = Boolean(previewItem && previewUrl && (previewKind === 'image' || previewKind === 'pdf' || previewKind === 'text'))
  const openPreviewInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className={`${containerClasses} ${className}`}>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept || undefined}
        multiple={isMultiple}
        onChange={handleInputChange}
        disabled={uploadDisabled}
      />

      <div
        onClick={() => openPicker()}
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault()
          if (!uploadDisabled) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        role="button"
        tabIndex={0}
        aria-label={`Upload files for ${field?.label || 'file field'}`}
        className={[
          'group flex min-h-36 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition outline-none',
          uploadDisabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-950'
            : isDragging
              ? 'border-orange-500 bg-orange-50 dark:border-orange-400 dark:bg-orange-950/20'
              : 'border-slate-300 bg-slate-50 hover:border-orange-400 hover:bg-orange-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-orange-500/70 dark:hover:bg-orange-950/20',
        ].join(' ')}
      >
        <div className="max-w-md space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <Upload className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Drag and drop files here
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Or <span className="font-medium text-orange-600 dark:text-orange-400">browse</span> from your device
            </p>
          </div>
          {helpText.length > 0 && (
            <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
              {helpText.map((hint) => (
                <p key={hint}>{hint}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => openPicker()}
          disabled={uploadDisabled}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          Browse files
        </button>
      </div>

      {maxReached && maxCountMessage && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-amber-300">
          {maxCountMessage}
        </div>
      )}

      {selectionErrors.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/70 dark:bg-amber-950/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              {selectionErrors.map((message) => (
                <p key={message} className="text-sm text-amber-700 dark:text-amber-300">
                  {message}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {externalErrors.length > 0 && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/70 dark:bg-red-950/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <div className="space-y-1">
              {externalErrors.map((error, index) => (
                <p key={`${error.message}-${index}`} className="text-sm text-red-700 dark:text-red-300">
                  {error.message}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const meta = getFileMeta(item)
            const Icon = meta.icon
            const kind = getPreviewKind(item)
            const canPreview = item.status === 'success' && kind !== 'unsupported'
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                      <Icon className={`h-6 w-6 ${meta.accent}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {item.name}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadge(item.status)}`}>
                          {item.status === 'success'
                            ? 'Uploaded'
                            : item.status === 'uploading'
                              ? 'Uploading'
                              : item.status === 'error'
                                ? 'Failed'
                                : item.status === 'cancelled'
                                  ? 'Cancelled'
                          : 'Ready'}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatFileSize(item.size)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {meta.label}
                        {item.contentType ? ` • ${item.contentType}` : ''}
                      </p>
                      {item.status === 'uploading' && (
                        <div className="mt-2">
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full bg-orange-500 transition-all"
                              style={{ width: `${item.progress || 0}%` }}
                            />
                          </div>
                          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>Uploading</span>
                            <span>{item.progress || 0}%</span>
                          </div>
                        </div>
                      )}
                      {item.error && (
                        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{item.error}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => handlePreview(item)}
                      disabled={!canPreview || previewLoading}
                      title={!canPreview ? 'Preview not available' : 'Preview file'}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-orange-500/60 dark:hover:text-orange-300"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {previewButtonLabel(kind)}
                    </button>
                    <button
                      type="button"
                      onClick={() => openPicker(item.id)}
                      disabled={item.status === 'uploading'}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-orange-500/60 dark:hover:text-orange-300"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                    {item.status === 'uploading' && (
                      <button
                        type="button"
                        onClick={() => cancelUpload(item.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    )}
                    {item.status === 'error' && (
                      <button
                        type="button"
                        onClick={() => retryUpload(item.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-950/40"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {previewError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/20 dark:text-red-300">
          {previewError}
        </div>
      )}

      {items.some((item) => item.status === 'uploading') && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300">
          <CheckCircle2 className="h-4 w-4 animate-pulse" />
          Uploading files. You can continue filling the form while uploads finish.
        </div>
      )}

      {isPreviewOpen && previewItem && (
        <PreviewModal
          item={{ ...previewItem, sizeLabel: formatFileSize(previewItem.size) }}
          previewUrl={previewUrl}
          previewText={previewText}
          previewKind={previewKind}
          zoom={previewZoom}
          onClose={closePreview}
          onZoomIn={() => setPreviewZoom((current) => Math.min(3, Number((current + 0.1).toFixed(2))))}
          onZoomOut={() => setPreviewZoom((current) => Math.max(0.5, Number((current - 0.1).toFixed(2))))}
          onZoomChange={setPreviewZoom}
          onOpenInNewTab={openPreviewInNewTab}
          loading={previewLoading}
        />
      )}
    </div>
  )
}

export default function FileUpload(props) {
  const { control, name, ...rest } = props

  if (control && name) {
    return (
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <FileUploadView {...rest} value={field.value} onChange={field.onChange} />
        )}
      />
    )
  }

  return <FileUploadView {...rest} />
}
