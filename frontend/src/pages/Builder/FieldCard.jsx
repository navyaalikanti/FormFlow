/**
 * FieldCard – a single draggable field in the builder canvas.
 */
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Copy, GripVertical, Pencil, Star, Trash2 } from 'lucide-react'
import { ICON_MAP } from './fieldConstants'

function FieldPreview({ field }) {
  const t = field.field_type
  const placeholder = field.placeholder || ''
  const helper = field.helper_text

  if (t === 'section') {
    return (
      <div className="pointer-events-none select-none">
        <div className="h-px w-full bg-slate-200 dark:bg-slate-700" />
      </div>
    )
  }

  if (t === 'paragraph') {
    return (
      <textarea
        readOnly
        rows={(field.config || {}).rows || 3}
        placeholder={placeholder || 'Long answer text…'}
        className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
      />
    )
  }

  if (t === 'dropdown') {
    return (
      <select disabled className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800">
        <option>{placeholder || 'Select an option…'}</option>
        {(field.options || []).map((o, i) => <option key={i}>{o.label}</option>)}
      </select>
    )
  }

  if (t === 'radio') {
    return (
      <div className="space-y-1.5">
        {(field.options?.length ? field.options : [{ label: 'Option 1' }, { label: 'Option 2' }]).map((o, i) => (
          <label key={i} className="flex cursor-not-allowed items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-slate-300 dark:border-slate-600" />
            {o.label}
          </label>
        ))}
      </div>
    )
  }

  if (t === 'checkbox') {
    return (
      <div className="space-y-1.5">
        {(field.options?.length ? field.options : [{ label: 'Option 1' }, { label: 'Option 2' }]).map((o, i) => (
          <label key={i} className="flex cursor-not-allowed items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="h-4 w-4 flex-shrink-0 rounded border-2 border-slate-300 dark:border-slate-600" />
            {o.label}
          </label>
        ))}
      </div>
    )
  }

  if (t === 'date') {
    return <input type="date" readOnly disabled className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800" />
  }

  if (t === 'time') {
    return <input type="time" readOnly disabled className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800" />
  }

  if (t === 'rating') {
    const max = (field.config || {}).max_stars || 5
    return (
      <div className="flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <Star key={i} size={18} className="text-slate-300 dark:text-slate-600" />
        ))}
      </div>
    )
  }

  if (t === 'file') {
    return (
      <div className="flex h-16 w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
        Click or drag to upload
      </div>
    )
  }

  // Short Text, Number, Email, Phone, URL, Text fields
  if (t === 'short_text' || t === 'text') {
    return (
      <input
        type="text"
        readOnly
        placeholder={placeholder || 'Short answer…'}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
      />
    )
  }

  if (t === 'email') {
    return (
      <input
        type="email"
        readOnly
        placeholder={placeholder || 'email@example.com'}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
      />
    )
  }

  if (t === 'number') {
    return (
      <input
        type="number"
        readOnly
        placeholder={placeholder || '0'}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
      />
    )
  }

  if (t === 'phone') {
    return (
      <input
        type="tel"
        readOnly
        placeholder={placeholder || '+1 (555) 000-0000'}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
      />
    )
  }

  if (t === 'url') {
    return (
      <input
        type="url"
        readOnly
        placeholder={placeholder || 'https://example.com'}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
      />
    )
  }

  // Default: other unknown types
  return (
    <input
      type="text"
      readOnly
      placeholder={placeholder || 'Answer text…'}
      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
    />
  )
}

export default function FieldCard({ field, isSelected, onSelect, onDuplicate, onDelete, fieldTypeColor, disabled }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : undefined,
  }

  const isSection = field.field_type === 'section'

  const handleDuplicate = (e) => {
    e.stopPropagation()
    if (!disabled) onDuplicate(field)
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    if (!disabled) onDelete(field)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(field)}
      className={`group relative cursor-pointer rounded-2xl border bg-white transition-all duration-150 dark:bg-slate-900 ${
        isSelected
          ? 'border-orange-500 shadow-md shadow-orange-500/10 ring-2 ring-orange-500/20'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:hover:border-slate-700'
      } ${isSection ? 'py-4' : 'p-4'} ${disabled ? 'opacity-75' : ''}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...(disabled ? {} : listeners)}
        onClick={(e) => e.stopPropagation()}
        className={`absolute left-2 top-1/2 -translate-y-1/2 rounded-lg p-1 transition-colors ${
          disabled ? 'cursor-not-allowed text-slate-300 dark:text-slate-700' : 'cursor-grab active:cursor-grabbing'
        } ${
          isSelected
            ? 'text-orange-500'
            : 'text-slate-400 dark:text-slate-600'
        }`}
      >
        <GripVertical size={14} />
      </div>

      {/* Colored left bar */}
      {isSelected && (
        <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-orange-500" />
      )}

      <div className="pl-4">
        {isSection ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Section</span>
            <span className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{field.label}</span>
          </div>
        ) : (
          <>
            {/* Field label row */}
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{field.label}</span>
                  {field.is_required && <span className="flex-shrink-0 text-brand-500">*</span>}
                </div>
                {field.description && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">{field.description}</p>
                )}
              </div>
            </div>

            {/* Preview */}
            <FieldPreview field={field} />

            {field.helper_text && (
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{field.helper_text}</p>
            )}
          </>
        )}
      </div>

      {/* Action buttons – shown on hover / selected */}
      <div
        className={`absolute right-2 top-2 flex items-center gap-1 rounded-xl border border-slate-100 bg-white/90 p-1 shadow-sm backdrop-blur-sm transition-all duration-150 dark:border-slate-700 dark:bg-slate-900/90 ${
          isSelected ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'
        } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          title="Edit"
          onClick={() => onSelect(field)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-orange-900/20 disabled:cursor-not-allowed"
          disabled={disabled}
        >
          <Pencil size={13} />
        </button>
        <button
          title="Duplicate"
          onClick={handleDuplicate}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-orange-900/20 disabled:cursor-not-allowed"
          disabled={disabled}
        >
          <Copy size={13} />
        </button>
        <button
          title="Delete"
          onClick={handleDelete}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 disabled:cursor-not-allowed"
          disabled={disabled}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
