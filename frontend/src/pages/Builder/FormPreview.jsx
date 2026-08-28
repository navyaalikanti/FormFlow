/**
 * FormPreview – renders the form exactly as a respondent would see it.
 * Used in the Preview tab of the builder.
 */
import { Star } from 'lucide-react'

function PreviewField({ field }) {
  const t = field.field_type

  if (t === 'section') {
    return (
      <div className="py-2">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{field.label}</h3>
        {field.description && <p className="text-sm text-slate-500">{field.description}</p>}
        <div className="mt-2 h-px bg-slate-200 dark:bg-slate-700" />
      </div>
    )
  }

  const label = (
    <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
      {field.label}
      {field.is_required && <span className="ml-1 text-red-500">*</span>}
    </label>
  )

  const helper = field.helper_text && (
    <p className="mt-1 text-xs text-slate-400">{field.helper_text}</p>
  )

  const inputCls =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'

  if (t === 'paragraph') {
    return (
      <div>
        {label}
        <textarea
          rows={(field.config || {}).rows || 4}
          placeholder={field.placeholder || ''}
          className={`${inputCls} resize-none`}
        />
        {helper}
      </div>
    )
  }

  if (t === 'dropdown') {
    return (
      <div>
        {label}
        <select className={inputCls}>
          <option value="">{field.placeholder || 'Select…'}</option>
          {(field.options || []).map((o) => (
            <option key={o.option_value} value={o.option_value}>{o.label}</option>
          ))}
        </select>
        {helper}
      </div>
    )
  }

  if (t === 'radio') {
    return (
      <div>
        {label}
        <div className="space-y-2">
          {(field.options?.length ? field.options : [{ label: 'Option 1', option_value: 'o1' }]).map((o) => (
            <label key={o.option_value} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input type="radio" name={field.field_key} value={o.option_value} className="accent-orange-500" />
              {o.label}
            </label>
          ))}
        </div>
        {helper}
      </div>
    )
  }

  if (t === 'checkbox') {
    return (
      <div>
        {label}
        <div className="space-y-2">
          {(field.options?.length ? field.options : [{ label: 'Option 1', option_value: 'o1' }]).map((o) => (
            <label key={o.option_value} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input type="checkbox" value={o.option_value} className="accent-orange-500" />
              {o.label}
            </label>
          ))}
        </div>
        {helper}
      </div>
    )
  }

  if (t === 'date') {
    return <div>{label}<input type="date" className={inputCls} />{helper}</div>
  }

  if (t === 'time') {
    return <div>{label}<input type="time" className={inputCls} />{helper}</div>
  }

  if (t === 'rating') {
    const max = (field.config || {}).max_stars || 5
    return (
      <div>
        {label}
        <div className="flex gap-1.5">
          {Array.from({ length: max }).map((_, i) => (
            <button key={i} type="button" className="text-slate-300 hover:text-amber-400 transition-colors dark:text-slate-600">
              <Star size={22} className="fill-current" />
            </button>
          ))}
        </div>
        {helper}
      </div>
    )
  }

  if (t === 'file') {
    return (
      <div>
        {label}
        <div className="flex h-24 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400 transition hover:border-brand-400 hover:text-brand-500 dark:border-slate-700 dark:bg-slate-900">
          Click or drag a file to upload
        </div>
        {helper}
      </div>
    )
  }

  // Short Text, Text fields
  if (t === 'short_text' || t === 'text') {
    return (
      <div>
        {label}
        <input type="text" placeholder={field.placeholder || ''} className={inputCls} />
        {helper}
      </div>
    )
  }

  // Email field
  if (t === 'email') {
    return (
      <div>
        {label}
        <input type="email" placeholder={field.placeholder || 'email@example.com'} className={inputCls} />
        {helper}
      </div>
    )
  }

  // Number field
  if (t === 'number') {
    return (
      <div>
        {label}
        <input type="number" placeholder={field.placeholder || ''} className={inputCls} />
        {helper}
      </div>
    )
  }

  // Phone field
  if (t === 'phone') {
    return (
      <div>
        {label}
        <input type="tel" placeholder={field.placeholder || '+1 (555) 000-0000'} className={inputCls} />
        {helper}
      </div>
    )
  }

  // URL field
  if (t === 'url') {
    return (
      <div>
        {label}
        <input type="url" placeholder={field.placeholder || 'https://example.com'} className={inputCls} />
        {helper}
      </div>
    )
  }

  // Default / unknown types
  return (
    <div>
      {label}
      <input type="text" placeholder={field.placeholder || 'Answer text'} className={inputCls} />
      {helper}
    </div>
  )
}

export default function FormPreview({ form }) {
  if (!form) return null

  const allFields = (form.sections || []).flatMap((s) => s.fields || [])

  return (
    <div className="mx-auto max-w-2xl">
      {/* Form header */}
      <div className="mb-8 rounded-2xl border border-t-4 border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900" style={{ borderTopColor: '#f97316' }}>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{form.title || 'Untitled Form'}</h1>
        {form.description && <p className="mt-2 text-slate-500">{form.description}</p>}
      </div>

      {/* Fields */}
      <div className="space-y-5">
        {allFields.map((field) => (
          <div key={field.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <PreviewField field={field} />
          </div>
        ))}
      </div>

      {allFields.length > 0 && (
        <div className="mt-8">
          <button className="w-full rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-sm shadow-brand-500/30 transition hover:bg-brand-600 active:scale-95">
            Submit
          </button>
        </div>
      )}
    </div>
  )
}
