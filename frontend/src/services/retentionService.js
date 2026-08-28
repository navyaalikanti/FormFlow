/**
 * retentionService.js – API client for data retention policy management
 */

import api from '../lib/api'

const RETENTION_API_BASE = '/api/forms'

/**
 * Get retention policy for a form
 * @param {string} formId - Form UUID
 * @returns {Promise<Object>} Retention policy data
 */
export async function getRetentionPolicy(formId) {
  try {
    const response = await api.get(`${RETENTION_API_BASE}/${formId}/retention-policy`)
    return response.data
  } catch (error) {
    console.error('Failed to fetch retention policy:', error)
    throw error
  }
}

/**
 * Update retention policy for a form
 * @param {string} formId - Form UUID
 * @param {Object} policy - Policy data (enabled, retention_days, action)
 * @returns {Promise<Object>} Updated retention policy
 */
export async function updateRetentionPolicy(formId, policy) {
  try {
    const response = await api.patch(`${RETENTION_API_BASE}/${formId}/retention-policy`, policy)
    return response.data
  } catch (error) {
    console.error('Failed to update retention policy:', error)
    throw error
  }
}

/**
 * Manually trigger retention archival job (admin/testing only)
 * @returns {Promise<Object>} Archival result (forms_processed, responses_archived, execution_time_ms)
 */
export async function triggerRetentionArchival() {
  try {
    const response = await api.post('/admin/retention/run')
    return response.data
  } catch (error) {
    console.error('Failed to trigger retention archival:', error)
    throw error
  }
}
