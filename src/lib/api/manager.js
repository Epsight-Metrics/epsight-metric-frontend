// QC Manager API — KPI, trends, inspections, alerts, export
import { api } from './client.js';

/**
 * Get KPI summary data.
 */
export async function getKpi() {
  return api.get('/qcmanager/kpi');
}

/**
 * Get trend data.
 * @param {string} period - 'day' | 'week' | 'month'
 */
export async function getTrends(period = 'day') {
  return api.get('/qcmanager/trends', { period });
}

/**
 * Get inspection list with filters and pagination.
 */
export async function getInspections(params = {}) {
  return api.get('/qcmanager/inspections', params);
}

/**
 * Get NG alert summary.
 */
export async function getAlertSummary(params = {}) {
  return api.get('/qcmanager/alert-summary', params);
}

/**
 * Export inspection data as CSV or PDF.
 * @param {object} params - { format, partName?, partCode?, status?, dateFrom?, dateTo? }
 * @returns {Promise<Blob>}
 */
export async function exportData(params = {}) {
  return api.download('/qcmanager/export', params);
}
