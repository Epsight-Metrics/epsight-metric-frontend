// QC Manager API — KPI, trends, inspections, alerts, export
import { api } from './client.js';

export async function getKpi(params = {}, options = {}) {
  return api.get('/qcmanager/kpi', params, options);
}

/**
 * Get trend data.
 * @param {string} period - 'day' | 'week' | 'month'
 * @param {object} params - Additional params like dateFrom, dateTo
 */
export async function getTrends(period = 'day', params = {}, options = {}) {
  // If dateFrom and dateTo provided, backend will ignore period
  return api.get('/qcmanager/trends', { period, ...params }, options);
}

/**
 * Get inspection list with filters and pagination.
 */
export async function getInspections(params = {}, options = {}) {
  return api.get('/qcmanager/inspections', params, options);
}

/**
 * Get NG alert summary.
 */
export async function getAlertSummary(params = {}, options = {}) {
  return api.get('/qcmanager/alert-summary', params, options);
}

/**
 * Export inspection data as CSV or PDF.
 * @param {object} params - { format, partName?, partCode?, status?, dateFrom?, dateTo? }
 * @returns {Promise<Blob>}
 */
export async function exportData(params = {}) {
  return api.download('/qcmanager/export', params);
}

/**
 * Create a new part (QC Manager / Admin).
 */
export async function createPart(data) {
  return api.post('/qcmanager/parts', data);
}

/**
 * Update an existing part (QC Manager / Admin).
 */
export async function updatePart(id, data) {
  return api.put(`/qcmanager/parts/${id}`, data);
}

/**
 * Delete a part (QC Manager / Admin).
 */
export async function deletePart(id) {
  return api.delete(`/qcmanager/parts/${id}`);
}

