/**
 * FormBuilderPage – the full-screen form builder.
 *
 * Layout:
 *   ┌─────────┬─────────────────────────┬──────────────┐
 *   │ Palette │      Canvas / Preview   │  Properties  │
 *   └─────────┴─────────────────────────┴──────────────┘
 */
import { arrayMove } from '@dnd-kit/sortable'
import { Archive, ArrowLeft, Clock, Eye, History, Pencil, Save, Share2, X, GitBranch } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { builderService } from '../../services/builderService'
import FieldPalette from './FieldPalette'
import FormCanvas from './FormCanvas'
import FormPreview from './FormPreview'
import PreviewWithConditionalLogic from './PreviewWithConditionalLogic'
import MultiPagePreview from './MultiPagePreview'
import PropertyPanelTabs from './PropertyPanelTabs'
import ConditionalLogicPanel from './ConditionalLogicPanel'
import PublishConfirmModal from '../../components/modals/PublishConfirmModal'
import PublishSuccessModal from '../../components/modals/PublishSuccessModal'
import ArchiveConfirmModal from '../../components/modals/ArchiveConfirmModal'
import ShareableLinkModal from '../../components/modals/ShareableLinkModal'
import StatusBadge from '../../components/StatusBadge'

// ─── constants ────────────────────────────────────────────────────────────────
const AUTOSAVE_DELAY = 1200 // ms after last change before persisting

// ─── helpers ─────────────────────────────────────────────────────────────────
const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`

function useDebounce(fn, delay) {
  const timerRef = useRef(null)
  return useCallback(
    (...args) => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => fn(...args), delay)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn, delay],
  )
}

// ─── component ────────────────────────────────────────────────────────────────
export default function FormBuilderPage() {
  const { formId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [form, setForm] = useState(null)
  const [fieldTypes, setFieldTypes] = useState([])
  const [selectedField, setSelectedField] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('build') // 'build' | 'preview'
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [showPublishSuccessModal, setShowPublishSuccessModal] = useState(false)
  const [publishedShareToken, setPublishedShareToken] = useState(null)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [publishLoading, setPublishLoading] = useState(false)
  const [conditionalLogicRules, setConditionalLogicRules] = useState([])
  
  // Title and Description editing
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [titleError, setTitleError] = useState(null)
  const [descriptionError, setDescriptionError] = useState(null)

  // Version history panel
  const [showVersionPanel, setShowVersionPanel] = useState(false)
  const [versions, setVersions] = useState([])
  const [versionsLoading, setVersionsLoading] = useState(false)

  // Logic panel
  const [showLogicPanel, setShowLogicPanel] = useState(false)

  // Version viewing (Historical snapshots)
  const [viewingVersionId, setViewingVersionId] = useState(null)
  const [viewingVersionData, setViewingVersionData] = useState(null)
  const versionCache = useRef({})

  // Derived active state
  const isHistorical = !!viewingVersionId
  const isReadOnly = isHistorical || form?.status === 'published'
  
  const activeForm = viewingVersionData ? {
    ...form,
    title: viewingVersionData.title || viewingVersionData.snapshot?.form?.title || form?.title,
    description: viewingVersionData.description || viewingVersionData.snapshot?.form?.description || form?.description,
    sections: viewingVersionData.snapshot?.sections || [],
  } : form

  const activeLogicRules = viewingVersionData
    ? (viewingVersionData.snapshot?.conditional_logic_rules || [])
    : conditionalLogicRules

  // Map field_type -> metadata for quick access
  const fieldTypeMap = fieldTypes.reduce((acc, ft) => {
    acc[ft.type] = ft
    return acc
  }, {})

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    Promise.all([
      builderService.getForm(formId),
      builderService.getFieldTypes(),
      builderService.getConditionalLogicRules(formId),
    ])
      .then(([formData, typesData, rulesData]) => {
        if (cancelled) return
        setForm(formData)
        setFieldTypes(typesData.field_types || [])
        setConditionalLogicRules(rulesData || [])
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.detail || 'Failed to load form')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [formId])

  // ── Persist reorder ───────────────────────────────────────────────────────
  const persistReorder = useCallback(
    async (sections) => {
      const fieldOrders = sections.flatMap((s) =>
        (s.fields || []).map((f, idx) => ({
          field_id: f.id,
          sort_order: idx,
          section_id: s.id,
        })),
      )
      setSaving(true)
      try {
        await builderService.reorderFields(formId, fieldOrders)
      } catch (e) {
        console.error('Reorder failed', e)
      } finally {
        setSaving(false)
      }
    },
    [formId],
  )

  const debouncedReorder = useDebounce(persistReorder, AUTOSAVE_DELAY)

  // ── Drag end ──────────────────────────────────────────────────────────────
  const handleDragEnd = useCallback(
    ({ active, over }) => {
      if (!over || active.id === over.id) return

      setForm((prev) => {
        // Find which section contains active and over
        let activeSectionIdx = -1
        let activeFieldIdx = -1
        let overSectionIdx = -1
        let overFieldIdx = -1

        prev.sections.forEach((s, si) => {
          (s.fields || []).forEach((f, fi) => {
            if (f.id === active.id) { activeSectionIdx = si; activeFieldIdx = fi }
            if (f.id === over.id) { overSectionIdx = si; overFieldIdx = fi }
          })
        })

        if (activeSectionIdx === -1) return prev

        const newSections = prev.sections.map((s) => ({ ...s, fields: [...(s.fields || [])] }))

        if (activeSectionIdx === overSectionIdx) {
          // Same section – arrayMove
          newSections[activeSectionIdx].fields = arrayMove(
            newSections[activeSectionIdx].fields,
            activeFieldIdx,
            overFieldIdx,
          )
        } else if (overSectionIdx !== -1) {
          // Move across sections
          const [moved] = newSections[activeSectionIdx].fields.splice(activeFieldIdx, 1)
          moved.section_id = newSections[overSectionIdx].id
          newSections[overSectionIdx].fields.splice(overFieldIdx, 0, moved)
        }

        debouncedReorder(newSections)
        return { ...prev, sections: newSections }
      })
    },
    [debouncedReorder],
  )

  // ── Add section ───────────────────────────────────────────────────────────
  const handleAddSection = useCallback(async () => {
    if (!form) return

    // Create new section without persisting yet (optimistic)
    const newSectionOrder = form.sections?.length || 0
    setSaving(true)

    try {
      // Build sections payload with new section
      const newSection = {
        title: `Section ${newSectionOrder + 1}`,
        description: null,
        section_order: newSectionOrder,
        is_collapsible: false,
        fields: [],
      }

      const updatedForm = await builderService.updateForm(formId, {
        sections: [...(form.sections || []), newSection],
      })

      setForm(updatedForm)
    } catch (e) {
      console.error('Add section failed', e)
    } finally {
      setSaving(false)
    }
  }, [form, formId])

  // ── Sync selectedField with form.sections whenever form changes ─────────────
  useEffect(() => {
    if (!selectedField) return
    
    // Find the field in the current form.sections
    let currentField = null
    for (const section of form?.sections || []) {
      currentField = (section.fields || []).find(f => f.id === selectedField.id)
      if (currentField) break
    }
    
    // If field exists in form.sections but selectedField is stale, update it
    if (currentField && currentField !== selectedField) {
      setSelectedField(currentField)
    }
  }, [form?.sections, selectedField])

  // ── Add field ─────────────────────────────────────────────────────────────
  const handleAddField = useCallback(
    async (fieldType) => {
      // Special handling for Section field type
      if (fieldType.type === 'section') {
        // Create a new actual section
        if (!form) return

        const newSectionOrder = form.sections?.length || 0
        setSaving(true)

        try {
          const newSection = {
            title: `Section ${newSectionOrder + 1}`,
            description: null,
            section_order: newSectionOrder,
            is_collapsible: false,
            fields: [],
          }

          const updatedForm = await builderService.updateForm(formId, {
            sections: [...(form.sections || []), newSection],
          })

          setForm(updatedForm)
          // Select the new section for next fields to be added there
          if (updatedForm.sections && updatedForm.sections.length > 0) {
            // No need to select anything - next field will auto-select the last section
          }
        } catch (e) {
          console.error('Add section failed', e)
        } finally {
          setSaving(false)
        }
        return
      }

      // Normal field creation
      // Find section to add field to:
      // 1. If a field is selected, use its section
      // 2. Otherwise use the LAST section (most recently created)
      let targetSection = null
      
      if (selectedField && form?.sections) {
        // Find the section containing the selected field
        for (const section of form.sections) {
          if (section.fields?.some(f => f.id === selectedField.id)) {
            targetSection = section
            break
          }
        }
      }
      
      // If no section found yet, use the LAST section (for new sections)
      if (!targetSection && form?.sections && form.sections.length > 0) {
        targetSection = form.sections[form.sections.length - 1]
      }
      
      if (!targetSection) return

      const payload = {
        label: fieldType.label,
        field_type: fieldType.type,
        config: fieldType.default_config || {},
        options:
          fieldType.type === 'dropdown' || fieldType.type === 'radio' || fieldType.type === 'checkbox'
            ? [
                { label: 'Option 1', option_value: 'option_1', sort_order: 0, is_default: false, option_config: {} },
                { label: 'Option 2', option_value: 'option_2', sort_order: 1, is_default: false, option_config: {} },
              ]
            : [],
        section_id: targetSection.id,
      }

      // Optimistic UI
      const tempId = generateTempId()
      const tempField = {
        ...payload,
        id: tempId,
        form_id: formId,
        section_id: targetSection.id,
        field_key: tempId,
        is_required: false,
        is_hidden: false,
        is_read_only: false,
        allows_multiple: false,
        sort_order: (targetSection.fields?.length || 0),
        description: null,
        placeholder: null,
        helper_text: null,
        default_value: null,
        validation_rules: {},
        ai_config: {},
      }

      setForm((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === targetSection.id ? { ...s, fields: [...(s.fields || []), tempField] } : s,
        ),
      }))
      setSelectedField(tempField)

      setSaving(true)
      try {
        const created = await builderService.createField(formId, payload)
        // Replace temp field with the real one and sync selectedField
        setForm((prev) => {
          const newForm = {
            ...prev,
            sections: prev.sections.map((s) =>
              s.id === targetSection.id
                ? { ...s, fields: (s.fields || []).map((f) => (f.id === tempId ? created : f)) }
                : s,
            ),
          }
          // Sync selectedField to the created field
          setSelectedField(created)
          return newForm
        })
      } catch (e) {
        console.error('Failed to create field', e)
        // Rollback optimistic update
        setForm((prev) => ({
          ...prev,
          sections: prev.sections.map((s) =>
            s.id === targetSection.id
              ? { ...s, fields: (s.fields || []).filter((f) => f.id !== tempId) }
              : s,
          ),
        }))
        setSelectedField(null)
      } finally {
        setSaving(false)
      }
    },
    [form, formId, selectedField],
  )

  // ── Delete field ──────────────────────────────────────────────────────────
  const handleDeleteField = useCallback(
    async (field) => {
      const isTempId = String(field.id).startsWith('temp_')
      // Optimistic removal
      setForm((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => ({
          ...s,
          fields: (s.fields || []).filter((f) => f.id !== field.id),
        })),
      }))
      if (selectedField?.id === field.id) setSelectedField(null)
      if (!isTempId) {
        setSaving(true)
        try {
          await builderService.deleteField(field.id)
        } catch (e) {
          console.error('Delete failed', e)
        } finally {
          setSaving(false)
        }
      }
    },
    [selectedField],
  )

  // ── Duplicate field ───────────────────────────────────────────────────────
  const handleDuplicateField = useCallback(
    async (field) => {
      const sectionId = field.section_id
      const payload = {
        label: `${field.label} (Copy)`,
        field_type: field.field_type,
        description: field.description,
        placeholder: field.placeholder,
        helper_text: field.helper_text,
        config: field.config || {},
        validation_rules: field.validation_rules || {},
        ai_config: field.ai_config || {},
        is_required: field.is_required,
        is_hidden: field.is_hidden,
        is_read_only: field.is_read_only,
        allows_multiple: field.allows_multiple,
        options: (field.options || []).map(({ label, option_value, sort_order, is_default, option_config }) => ({
          label, option_value, sort_order, is_default, option_config,
        })),
        section_id: sectionId,
      }

      setSaving(true)
      try {
        const created = await builderService.createField(formId, payload)
        setForm((prev) => ({
          ...prev,
          sections: prev.sections.map((s) =>
            s.id === sectionId ? { ...s, fields: [...(s.fields || []), created] } : s,
          ),
        }))
      } catch (e) {
        console.error('Duplicate failed', e)
      } finally {
        setSaving(false)
      }
    },
    [formId],
  )

  // ── Update field properties ───────────────────────────────────────────────
  const handleUpdateField = useCallback(
    async (updatedField) => {
      const isTempId = String(updatedField.id).startsWith('temp_')
      if (isTempId) return // still being created

      setSaving(true)
      try {
        const saved = await builderService.updateField(updatedField.id, {
          label: updatedField.label,
          field_type: updatedField.field_type,
          description: updatedField.description,
          placeholder: updatedField.placeholder,
          helper_text: updatedField.helper_text,
          default_value: updatedField.default_value,
          config: updatedField.config,
          validation_rules: updatedField.validation_rules,
          ai_config: updatedField.ai_config,
          is_required: updatedField.is_required,
          is_hidden: updatedField.is_hidden,
          is_read_only: updatedField.is_read_only,
          allows_multiple: updatedField.allows_multiple,
          sort_order: updatedField.sort_order,
          options: updatedField.options,
        })
        
        // Update form state with saved data
        setForm((prev) => {
          const newForm = {
            ...prev,
            sections: prev.sections.map((s) => ({
              ...s,
              fields: (s.fields || []).map((f) => (f.id === saved.id ? saved : f)),
            })),
          }
          
          // Keep selectedField in sync with the new field from form.sections
          if (selectedField?.id === saved.id) {
            setSelectedField(saved)
          }
          
          return newForm
        })
      } catch (e) {
        console.error('Update failed', e)
      } finally {
        setSaving(false)
      }
    },
    [selectedField?.id],
  )

  // ── Save form title/desc ──────────────────────────────────────────────────
  const handleSaveMetadata = useCallback(async () => {
    if (!form) return
    setSaving(true)
    try {
      await builderService.updateForm(formId, { title: form.title, description: form.description })
    } catch (e) {
      console.error('Metadata save failed', e)
    } finally {
      setSaving(false)
    }
  }, [form, formId])

  // ── Title editing ──────────────────────────────────────────────────────────
  const handleTitleSave = useCallback(async () => {
    const title = form?.title?.trim() || ''
    
    // Validation
    if (!title) {
      setTitleError(t('builder.titleRequired'))
      return
    }
    if (title.length > 150) {
      setTitleError(t('builder.titleMaxLength'))
      return
    }
    
    setTitleError(null)
    setEditingTitle(false)
    
    setSaving(true)
    try {
      const updated = await builderService.updateForm(formId, { title: form.title })
      setForm(updated)
    } catch (e) {
      console.error('Title save failed', e)
      setTitleError(t('builder.failedToSaveTitle'))
    } finally {
      setSaving(false)
    }
  }, [form, formId])

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleSave()
    } else if (e.key === 'Escape') {
      setEditingTitle(false)
      setTitleError(null)
    }
  }

  // ── Description editing ────────────────────────────────────────────────────
  const handleDescriptionSave = useCallback(async () => {
    const description = form?.description?.trim() || ''
    
    // Validation
    if (description.length > 1000) {
      setDescriptionError(t('builder.descriptionMaxLength'))
      return
    }
    
    setDescriptionError(null)
    setEditingDescription(false)
    
    setSaving(true)
    try {
      const updated = await builderService.updateForm(formId, { description: form.description })
      setForm(updated)
    } catch (e) {
      console.error('Description save failed', e)
      setDescriptionError(t('builder.failedToSaveDescription'))
    } finally {
      setSaving(false)
    }
  }, [form, formId])

  const handleDescriptionKeyDown = (e) => {
    if (e.key === 'Escape') {
      setEditingDescription(false)
      setDescriptionError(null)
    }
  }

  // ── Publish form ───────────────────────────────────────────────────────────
  const handlePublish = useCallback(async (publishOptions) => {
    setPublishLoading(true)
    try {
      const result = await builderService.publishForm(formId, publishOptions)
      const publishedForm = result.form || result
      setShowPublishModal(false)
      // Show the publish success modal with the share token
      setPublishedShareToken(publishedForm.published_version_link_token || publishedForm.share_token)
      setShowPublishSuccessModal(true)
      // Form ID never changes in the new versioning model — just update the local state
      setForm(publishedForm)
      
      // Handle retention policy update if enabled
      if (publishOptions.retention_enabled) {
        try {
          const { updateRetentionPolicy } = await import('../../services/retentionService')
          await updateRetentionPolicy(formId, {
            enabled: publishOptions.retention_enabled,
            retention_days: publishOptions.retention_days,
            action: 'archive',
          })
        } catch (retentionError) {
          console.error('Failed to save retention policy:', retentionError)
          // Don't fail the entire publish if retention policy save fails
        }
      }
      
      // Refresh version list if panel is open
      if (showVersionPanel) {
        builderService.getFormVersions(formId).then(res => setVersions(res.items || [])).catch(() => {})
      }
    } catch (e) {
      console.error('Publish failed', e)
      setPublishLoading(false)
      alert(e?.response?.data?.detail || t('builder.failedToPublishForm'))
    }
  }, [formId, showVersionPanel])

  // ── Archive form ───────────────────────────────────────────────────────────
  const handleArchive = useCallback(async () => {
    setPublishLoading(true)
    try {
      const updated = await builderService.archiveForm(formId)
      setForm(updated)
      setShowArchiveModal(false)
    } catch (e) {
      console.error('Archive failed', e)
      alert(e?.response?.data?.detail || t('builder.failedToArchiveForm'))
    } finally {
      setPublishLoading(false)
    }
  }, [formId])

  // ── Edit as new draft ──────────────────────────────────────────────────────
  const handleEditAsNewDraft = useCallback(async () => {
    if (form?.status === 'draft') {
      if (window.confirm(t('builder.draftExistsConfirm'))) {
        setViewingVersionId(null)
        setViewingVersionData(null)
        setShowVersionPanel(false)
      }
      return
    }

    setSaving(true)
    try {
      const updated = await builderService.editAsNewDraft(formId)
      // Form ID stays the same — just update the local state
      setForm(updated)
      setViewingVersionId(null)
      setViewingVersionData(null)
      // Refresh version list if panel is open
      if (showVersionPanel) {
        builderService.getFormVersions(formId).then(res => setVersions(res.items || [])).catch(() => {})
      }
    } catch (e) {
      console.error('Edit as draft failed', e)
      alert(e?.response?.data?.detail || t('builder.failedToEditAsNewDraft'))
    } finally {
      setSaving(false)
    }
  }, [form?.status, formId, showVersionPanel])

  // ── Open version history panel ─────────────────────────────────────────────
  const handleOpenVersionPanel = useCallback(async () => {
    setShowLogicPanel(false)
    setShowVersionPanel(true)
    setVersionsLoading(true)
    try {
      const res = await builderService.getFormVersions(formId)
      setVersions(res.items || [])
    } catch (e) {
      console.error('Failed to load versions', e)
    } finally {
      setVersionsLoading(false)
    }
  }, [formId])

  const handleOpenLogicPanel = () => {
    setShowVersionPanel(false)
    setShowLogicPanel(true)
    // Rules are already fetched initially, but we can refresh them
    builderService.getConditionalLogicRules(formId)
      .then(rules => setConditionalLogicRules(rules || []))
      .catch(console.error)
  }

  // ── Version Click ────────────────────────────────────────────────────────
  const handleVersionClick = useCallback(async (version) => {
    // If clicking the current draft, revert to normal editing mode
    if (version.status === 'draft') {
      setViewingVersionId(null)
      setViewingVersionData(null)
      return
    }

    setViewingVersionId(version.id)
    if (versionCache.current[version.id]) {
      setViewingVersionData(versionCache.current[version.id])
      return
    }

    setVersionsLoading(true)
    try {
      const data = await builderService.getFormVersion(formId, version.id)
      versionCache.current[version.id] = data
      setViewingVersionData(data)
    } catch (e) {
      console.error('Failed to load version snapshot', e)
    } finally {
      setVersionsLoading(false)
    }
  }, [formId])

  // ── Restore version ────────────────────────────────────────────────────────
  const handleRestoreVersion = useCallback(async (e, versionId) => {
    e.stopPropagation() // Prevent triggering the card click
    
    if (form?.status === 'draft') {
      if (!window.confirm(t('builder.draftExistsRestoreConfirm'))) return
    } else {
      if (!window.confirm(t('builder.restoreVersionConfirm'))) return
    }
    
    setSaving(true)
    try {
      const result = await builderService.restoreVersion(formId, versionId)
      setForm(result.form)
      setViewingVersionId(null)
      setViewingVersionData(null)
      setShowVersionPanel(false)
      
      // Refresh versions
      const res = await builderService.getFormVersions(formId)
      setVersions(res.items || [])
    } catch (err) {
      console.error('Restore failed', err)
      alert(err?.response?.data?.detail || t('builder.failedToRestoreVersion'))
    } finally {
      setSaving(false)
    }
  }, [formId, form?.status])

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
          <p className="text-sm text-slate-400">{t('builder.loadingFormBuilder')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-900/20">
          <p className="font-semibold text-red-600 dark:text-red-400">{error}</p>
          <button onClick={() => navigate('/dashboard/forms')} className="mt-4 text-sm text-slate-500 underline">
            {t('builder.backToForms')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Archived banner */}
      {form?.status === 'archived' && (
        <div className="bg-red-50 px-4 py-3 dark:bg-red-900/20 border-b border-red-200 dark:border-red-900">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            {t('builder.archivedBanner')}
          </p>
        </div>
      )}

      {/* ── Top bar - Two-column header layout ─────────────────────────── */}
      <header className="flex flex-shrink-0 items-start gap-8 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-8">
        {/* LEFT SIDE (60%) - Back button + Title + Description */}
        <div className="flex flex-1 min-w-0 items-start gap-3">
          {/* Back button */}
          <button
            onClick={() => navigate('/dashboard/forms')}
            className="mt-1 flex-shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Title and Description - Editable Block */}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {/* Title */}
            {editingTitle && !isReadOnly ? (
              <input
                autoFocus
                type="text"
                maxLength={150}
                className="w-full max-w-3xl text-2xl font-bold outline-none bg-transparent border-b-2 border-orange-500 text-slate-900 placeholder:text-slate-400 dark:text-white dark:border-orange-400 pb-0.5"
                value={form?.title || ''}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                  setTitleError(null)
                }}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
              />
            ) : (
              <div
                className={`truncate text-2xl font-bold text-slate-900 dark:text-white transition flex items-center gap-3 ${
                  !isReadOnly ? 'hover:text-slate-700 dark:hover:text-slate-200 cursor-text' : ''
                }`}
                onClick={() => (!isReadOnly) && setEditingTitle(true)}
              >
                {activeForm?.title || t('builder.untitledForm')}
                {isHistorical && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {t('builder.viewingVersion', { version: viewingVersionData?.version_number })}
                  </span>
                )}
                {!isHistorical && form?.status === 'published' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {t('builder.published')}
                  </span>
                )}
                {form?.status === 'draft' && form?.published_version_id && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {t('builder.live')} · {t('builder.editingDraft')}
                  </span>
                )}
                {form?.status === 'archived' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    {t('builder.archived')}
                  </span>
                )}
              </div>
            )}

            {/* Title Error */}
            {titleError && (
              <p className="text-xs text-red-600 dark:text-red-400">{titleError}</p>
            )}

            {/* Description */}
            {editingDescription && !isReadOnly ? (
              <textarea
                autoFocus
                maxLength={1000}
                placeholder={t('builder.descriptionPlaceholder')}
                className="w-full max-w-3xl text-sm text-slate-600 dark:text-slate-300 outline-none bg-transparent border-b-2 border-orange-500 dark:border-orange-400 placeholder:text-slate-400 pb-0.5 resize-none font-normal"
                rows={Math.max(1, form?.description?.split('\n').length || 1)}
                value={form?.description || ''}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                  setDescriptionError(null)
                }}
                onBlur={handleDescriptionSave}
                onKeyDown={handleDescriptionKeyDown}
              />
            ) : (
              !isReadOnly ? (
                <div
                  className="truncate text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap cursor-text hover:text-slate-600 dark:hover:text-slate-300 transition"
                  onClick={() => setEditingDescription(true)}
                >
                  {activeForm?.description || t('builder.descriptionPlaceholder')}
                </div>
              ) : (
                <>
                  {activeForm?.description && (
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {activeForm.description}
                    </p>
                  )}
                </>
              )
            )}

            {/* Description Error */}
            {descriptionError && (
              <p className="text-xs text-red-600 dark:text-red-400">{descriptionError}</p>
            )}
          </div>
        </div>

        {/* RIGHT SIDE (40%) - Tab switcher + Action buttons */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {/* Tab switcher */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setTab('build')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                tab === 'build'
                  ? 'bg-white text-orange-600 shadow-sm dark:bg-slate-700 dark:text-orange-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <Pencil size={14} /> {t('builder.build')}
            </button>
            <button
              onClick={() => setTab('preview')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                tab === 'preview'
                  ? 'bg-white text-orange-600 shadow-sm dark:bg-slate-700 dark:text-orange-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <Eye size={14} /> {t('builder.preview')}
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Conditional Logic button */}
            <button
              onClick={handleOpenLogicPanel}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-orange-400 hover:text-orange-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-orange-500 dark:hover:text-orange-400"
              title={t('builder.conditionalLogic')}
            >
              <GitBranch size={14} />
              {t('builder.logicBtn')}
            </button>

            {/* Version History button — always visible */}
            <button
              onClick={handleOpenVersionPanel}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-orange-400 hover:text-orange-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-orange-500 dark:hover:text-orange-400"
              title={t('builder.versionHistory')}
            >
              <History size={14} />
              {t('builder.historyBtn')}
            </button>

            {form?.status === 'draft' && !isHistorical && (
              <>
                <button
                  onClick={handleSaveMetadata}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-orange-400 hover:text-orange-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-orange-500 dark:hover:text-orange-400"
                >
                  <Save size={14} />
                  {saving ? t('builder.saving') : t('common.save')}
                </button>

                <button
                  onClick={() => setShowPublishModal(true)}
                  className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700"
                >
                  <Share2 size={14} />
                  {t('builder.publishBtn')}
                </button>
              </>
            )}

            {(form?.status === 'published' || isHistorical) && (
              <>

                {!isHistorical && form?.status === 'published' && (
                  <button
                    onClick={() => setShowArchiveModal(true)}
                    className="flex items-center gap-2 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Archive size={14} />
                    {t('builder.archiveBtn')}
                  </button>
                )}

                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-orange-400 hover:text-orange-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-orange-500 dark:hover:text-orange-400"
                >
                  <Share2 size={14} />
                  {t('builder.shareBtn')}
                </button>

                <button
                  onClick={handleEditAsNewDraft}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50 dark:bg-orange-600 dark:hover:bg-orange-700"
                >
                  <Pencil size={14} />
                  {t('builder.editAsNewDraftBtn')}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {tab === 'build' ? (
          <>
            <FieldPalette 
              fieldTypes={fieldTypes} 
              onAddField={handleAddField}
              disabled={isReadOnly}
            />

            <FormCanvas
              sections={activeForm?.sections || []}
              selectedFieldId={selectedField?.id}
              onSelectField={setSelectedField}
              onDuplicateField={handleDuplicateField}
              onDeleteField={handleDeleteField}
              onDragEnd={handleDragEnd}
              fieldTypeMap={fieldTypeMap}
              saving={saving}
              disabled={isReadOnly}
            />

            <PropertyPanelTabs
              field={selectedField}
              onUpdate={handleUpdateField}
              onClose={() => setSelectedField(null)}
              allFields={(activeForm?.sections || []).flatMap((s) => s.fields || [])}
              readOnly={isReadOnly}
              formId={formId}
            />
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <MultiPagePreview
              form={activeForm}
              conditionalLogicRules={activeLogicRules}
              onClose={() => setTab('build')}
            />
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {showPublishModal && (
        <PublishConfirmModal
          formTitle={form?.title || t('builder.untitledForm')}
          onConfirm={handlePublish}
          onCancel={() => setShowPublishModal(false)}
          loading={publishLoading}
        />
      )}

      {showPublishSuccessModal && publishedShareToken && (
        <PublishSuccessModal
          shareToken={publishedShareToken}
          onClose={() => {
            setShowPublishSuccessModal(false)
            setPublishedShareToken(null)
          }}
        />
      )}

      {showArchiveModal && (
        <ArchiveConfirmModal
          formTitle={form?.title || t('builder.untitledForm')}
          onConfirm={handleArchive}
          onCancel={() => setShowArchiveModal(false)}
          loading={publishLoading}
        />
      )}

      {showShareModal && (activeForm?.share_token || activeForm?.published_version_link_token || viewingVersionData?.link_token) && (
        <ShareableLinkModal
          formId={form.id}
          shareToken={isHistorical ? viewingVersionData?.link_token : (form.published_version_link_token || form.share_token)}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* ── Version History Side Panel ───────────────────────────────────── */}
      {showVersionPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowVersionPanel(false)}
          />
          {/* Panel */}
          <div className="relative flex h-full w-[340px] flex-col bg-white shadow-2xl dark:bg-slate-900 animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History size={16} className="text-orange-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('builder.versionHistoryPanel')}</h2>
              </div>
              <button
                onClick={() => setShowVersionPanel(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Subtitle */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('builder.versionHistorySubtitle')} <span className="font-semibold text-slate-700 dark:text-slate-200">{form?.title}</span>.
                {t('builder.formIdNeverChanges')}
              </p>
            </div>

            {/* Version list */}
            <div className="flex-1 overflow-y-auto p-4">
              {versionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                </div>
              ) : versions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock size={28} className="mb-2 text-slate-300" />
                  <p className="text-xs text-slate-400">{t('builder.noVersionHistory')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.map((version) => {
                    const isCurrentPublished = version.id === form?.published_version_id
                    const isDraft = version.status === 'draft'
                    const isSelected = viewingVersionId 
                      ? viewingVersionId === version.id 
                      : isDraft

                    return (
                      <div
                        key={version.id}
                        onClick={() => handleVersionClick(version)}
                        className={`rounded-xl border p-4 cursor-pointer transition ${
                          isSelected ? 'ring-2 ring-orange-500 border-transparent shadow-sm ' : ''
                        } ${
                          isDraft
                            ? 'border-orange-200 bg-orange-50/60 dark:border-orange-900/50 dark:bg-orange-950/20 hover:border-orange-400'
                            : isCurrentPublished
                            ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20 hover:border-emerald-400'
                            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50 hover:border-slate-400'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">
                                V{version.version_number}
                              </span>
                              {isDraft && (
                                <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                                  {t('builder.draftBadge')}
                                </span>
                              )}
                              {isCurrentPublished && (
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                  {t('builder.liveBadge')}
                                </span>
                              )}
                              {!isDraft && !isCurrentPublished && version.status === 'published' && (
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                  {t('builder.publishedBadge')}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                              {version.title || form?.title}
                            </p>
                            {version.change_summary && (
                              <p className="mt-1 text-[10px] italic text-slate-400 dark:text-slate-500">
                                {version.change_summary}
                              </p>
                            )}
                            <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                              {version.published_at
                                ? `Published ${new Date(version.published_at).toLocaleString()}`
                                : `Created ${new Date(version.created_at).toLocaleString()}`}
                            </p>
                          </div>
                        </div>

                        {/* Restore button: always available for older published versions */}
                        {version.status === 'published' && !isDraft && !isCurrentPublished && (
                          <button
                            onClick={(e) => handleRestoreVersion(e, version.id)}
                            disabled={saving}
                            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-600 transition hover:border-orange-400 hover:text-orange-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          >
                            <History size={12} />
                            {t('builder.restoreAsDraftBtn')}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Conditional Logic Side Panel ───────────────────────────────────── */}
      {showLogicPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowLogicPanel(false)}
          />
          {/* Panel */}
          <div className="relative flex h-full w-[440px] flex-col bg-white shadow-2xl dark:bg-slate-900 animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <GitBranch size={16} className="text-orange-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('builder.conditionalLogicPanel')}</h2>
              </div>
              <button
                onClick={() => setShowLogicPanel(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <ConditionalLogicPanel
              allFields={(activeForm?.sections || []).flatMap((s) => s.fields || [])}
              conditionalLogicRules={conditionalLogicRules}
              formId={formId}
              isReadOnly={isReadOnly}
              onRulesChanged={(rules) => {
                setConditionalLogicRules(rules)
              }}
            />
          </div>
        </div>
      )}

    </div>
  )
}
