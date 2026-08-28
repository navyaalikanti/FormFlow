import api from '../lib/api'

/**
 * Form Builder API service
 * Wraps all field-related endpoints.
 */

export const builderService = {
  // ── Field Types ────────────────────────────────────────────────────────
  getFieldTypes: () => api.get('/field-types').then((r) => r.data),

  // ── Form detail (with sections & fields) ─────────────────────────────
  getForm: (formId) => api.get(`/forms/${formId}`).then((r) => r.data),

  // ── Field CRUD ─────────────────────────────────────────────────────────
  createField: (formId, payload) =>
    api.post(`/forms/${formId}/fields`, payload).then((r) => r.data),

  updateField: (fieldId, payload) =>
    api.put(`/fields/${fieldId}`, payload).then((r) => r.data),

  deleteField: (fieldId) =>
    api.delete(`/fields/${fieldId}`).then((r) => r.data),

  reorderFields: (formId, fieldOrders) =>
    api
      .put('/fields/reorder', { form_id: formId, field_orders: fieldOrders })
      .then((r) => r.data),

  // ── Form metadata update ───────────────────────────────────────────────
  updateForm: (formId, payload) =>
    api.put(`/forms/${formId}`, payload).then((r) => r.data),

  // ── Form publish/archive ────────────────────────────────────────────────
  publishForm: (formId, options = null) =>
    api.post(`/forms/${formId}/publish`, options || {}).then((r) => r.data),

  unpublishForm: (formId) =>
    api.post(`/forms/${formId}/unpublish`).then((r) => r.data),

  archiveForm: (formId) =>
    api.post(`/forms/${formId}/archive`).then((r) => r.data),

  restoreForm: (formId) =>
    api.post(`/forms/${formId}/restore`).then((r) => r.data),

  duplicateForm: (formId) =>
    api.post(`/forms/${formId}/duplicate`).then((r) => r.data),

  // ── Conditional Logic Rules ──────────────────────────────────────────────
  getConditionalLogicRules: (formId) =>
    api.get(`/forms/${formId}/conditional-logic/rules`).then((r) => r.data),

  createConditionalLogicRule: (formId, payload) =>
    api.post(`/forms/${formId}/conditional-logic/rules`, payload).then((r) => r.data),

  updateConditionalLogicRule: (formId, ruleId, payload) =>
    api.put(`/forms/${formId}/conditional-logic/rules/${ruleId}`, payload).then((r) => r.data),

  deleteConditionalLogicRule: (formId, ruleId) =>
    api.delete(`/forms/${formId}/conditional-logic/rules/${ruleId}`).then((r) => r.data),

  // ── Form Versioning ──────────────────────────────────────────────────
  // Returns { items: [...], total: N, current_version_id: uuid }
  getFormVersions: (formId) =>
    api.get(`/forms/${formId}/versions`).then((r) => r.data),

  getFormVersion: (formId, versionId) =>
    api.get(`/forms/${formId}/versions/${versionId}`).then((r) => r.data),

  restoreVersion: (formId, versionId) =>
    api.post(`/forms/${formId}/versions/${versionId}/restore`).then((r) => r.data),

  editAsDraft: (formId) =>
    api.post(`/forms/${formId}/edit-as-draft`).then((r) => r.data),

  // Alias used by FormBuilderPage
  editAsNewDraft: (formId) =>
    api.post(`/forms/${formId}/edit-as-draft`).then((r) => r.data),
}
