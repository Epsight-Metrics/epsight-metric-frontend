// Audit API — inspection logs, detail, export
import { api } from './client.js';

/**
 * Get inspection list with filters and pagination.
 */
export async function getInspections(params = {}) {
  return api.get('/audit/inspections', params);
}

/**
 * Export inspection data as CSV or PDF.
 * @param {object} params - { format, partName?, partCode?, status?, dateFrom?, dateTo? }
 * @returns {Promise<Blob>}
 */
export async function exportData(params = {}) {
  return api.download('/audit/export', params);
}

/**
 * Get detailed info for a specific inspection.
 * @param {string} id - Inspection ID
 */
export async function getInspectionDetail(id) {
  return api.get(`/audit/inspections/${id}`);
}
