/**
 * FormCanvas – the central drag-and-drop builder area.
 */
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Layout } from 'lucide-react'
import { useState } from 'react'
import FieldCard from './FieldCard'

/**
 * Check if a section title is a default/auto-generated title
 */
function isDefaultSectionTitle(title) {
  if (!title || !title.trim()) return true
  const trimmed = title.trim()
  // Check for patterns like "Untitled Section", "Section 1", "Section 2", etc.
  return trimmed === 'Untitled Section' || /^Section\s+\d+$/.test(trimmed)
}

export default function FormCanvas({
  sections,
  selectedFieldId,
  onSelectField,
  onDuplicateField,
  onDeleteField,
  onDragEnd,
  fieldTypeMap,
  saving,
  disabled,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Don't capture keyboard events inside form inputs
      shouldHandleKeydown: (args) => {
        const { active } = args
        // If nothing is being dragged, allow keyboard to work normally (for form inputs)
        if (!active) return false
        // If the focused element is a form input, don't capture keyboard
        const focusedElement = document.activeElement
        if (focusedElement?.tagName === 'INPUT' || focusedElement?.tagName === 'TEXTAREA' || focusedElement?.tagName === 'SELECT') {
          return false
        }
        return true
      },
    }),
  )

  const [activeId, setActiveId] = useState(null)

  // Flatten all fields across sections for the overlay
  const allFields = sections.flatMap((s) => s.fields || [])
  const activeField = allFields.find((f) => f.id === activeId)
  
  // Get all field IDs for the global SortableContext
  const allFieldIds = allFields.map(f => f.id)

  const handleDragStart = ({ active }) => {
    if (disabled) return
    setActiveId(active.id)
  }

  const handleDragEnd = (event) => {
    setActiveId(null)
    if (!disabled) {
      onDragEnd(event)
    }
  }

  const totalFields = allFields.length

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={allFieldIds} strategy={verticalListSortingStrategy}>
        <main className="flex flex-1 flex-col overflow-y-auto bg-slate-50 dark:bg-slate-950 hide-scrollbar">
          {/* Saving indicator */}
          {saving && (
            <div className="flex items-center justify-center gap-2 bg-orange-500/10 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
              Saving…
            </div>
          )}

          {disabled && (
            <div className="flex items-center justify-center gap-2 bg-amber-500/10 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <span>Read-only mode</span>
            </div>
          )}

          <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
            {sections.length === 0 || totalFields === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-8">
                {sections.map((section) => {
                  const fieldIds = (section.fields || []).map((f) => f.id)
                  const hasCustomTitle = !isDefaultSectionTitle(section.title)
                  
                  return (
                    <div key={section.id}>
                      {/* Section header – only show if custom title */}
                      {hasCustomTitle && (
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-800">
                            <Layout size={13} className="text-slate-500 dark:text-slate-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{section.title}</h3>
                            {section.description && (
                              <p className="text-xs text-slate-400">{section.description}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Fields */}
                      <div className="space-y-3">
                        {(section.fields || []).map((field) => (
                          <FieldCard
                            key={field.id}
                            field={field}
                            isSelected={field.id === selectedFieldId}
                            onSelect={onSelectField}
                            onDuplicate={onDuplicateField}
                            onDelete={onDeleteField}
                            fieldTypeColor={fieldTypeMap[field.field_type]?.color}
                            disabled={disabled}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </SortableContext>

      {/* Drag overlay – ghost card while dragging */}
      <DragOverlay>
        {activeField ? (
          <div className="rounded-2xl border border-orange-400 bg-white p-4 shadow-xl shadow-orange-500/20 opacity-90 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{activeField.label}</p>
            <p className="text-xs text-slate-400 capitalize">{activeField.field_type}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10">
        <Layout size={24} className="text-brand-500" />
      </div>
      <h3 className="mb-1 text-base font-bold text-slate-700 dark:text-slate-200">Start building your form</h3>
      <p className="text-sm text-slate-400 dark:text-slate-500">
        Click a field type from the left palette to add it here
      </p>
    </div>
  )
}
