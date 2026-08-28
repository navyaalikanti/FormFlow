/**
 * FieldPalette – left sidebar showing all draggable field type tiles.
 */
import { ICON_MAP } from './fieldConstants'

const FIELD_ORDER = [
  // Basic Fields
  ['short_text', 'paragraph', 'number', 'email', 'phone', 'url'],
  // Date & Time
  ['date', 'time'],
  // Additional Fields
  ['rating', 'file'],
  // Choice Fields + Section
  ['dropdown', 'radio', 'checkbox', 'section']
]

export default function FieldPalette({ fieldTypes, onAddField, disabled }) {
  // Group the field types according to the defined FIELD_ORDER array
  const groups = FIELD_ORDER.map((groupTypes) =>
    groupTypes
      .map((type) => (fieldTypes || []).find((ft) => ft.type === type))
      .filter(Boolean)
  ).filter((group) => group.length > 0)

  return (
    <aside className={`flex h-full w-64 flex-shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hide-scrollbar ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar">
        {groups.map((group, groupIdx) => (
          <div key={groupIdx} className="grid grid-cols-2 gap-2">
            {group.map((ft) => {
              const Icon = ICON_MAP[ft.icon]
              return (
                <button
                  key={ft.type}
                  onClick={() => !disabled && onAddField(ft)}
                  disabled={disabled}
                  title={ft.description}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-center transition-all duration-150 hover:border-orange-400 hover:bg-orange-50 hover:shadow-sm active:scale-95 disabled:cursor-not-allowed dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-orange-500 dark:hover:bg-orange-950/20"
                >
                  {Icon ? (
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100/70 text-orange-600 transition-colors dark:bg-orange-500/10 dark:text-orange-400"
                    >
                      <Icon size={15} strokeWidth={2} />
                    </span>
                  ) : (
                    <span className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
                  )}
                  <span className="text-[10px] font-semibold leading-tight text-slate-700 group-hover:text-orange-600 dark:text-slate-200 dark:group-hover:text-orange-400">
                    {ft.label}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </aside>
  )
}

