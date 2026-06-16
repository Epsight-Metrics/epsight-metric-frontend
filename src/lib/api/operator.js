// Operator API — session management, inspection, parts
import { api } from './client.js';

/**
 * Start a new inspection session.
 */
export async function startSession() {
  return api.post('/operator/session/start');
}

/**
 * Stop an active session.
 * @param {string} sessionId
 */
export async function stopSession(sessionId) {
  return api.post('/operator/session/stop', { sessionId });
}

/**
 * Get current session info and recent inspections.
 */
export async function getSession() {
  return api.get('/operator/session');
}

/**
 * Submit a manual inspection result.
 * @param {object} data - Inspection payload
 */
export async function submitInspection(data) {
  return api.post('/operator/inspect', data);
}

/**
 * Get available parts list.
 */
export async function getParts() {
  return api.get('/operator/parts');
}

/**
 * Submit a CV inspection result (no auth required).
 * @param {object} data - CV Inspection payload
 */
export async function submitCvInspection(data) {
  return api.post('/operator/inspect/cv', data);
}

/**
 * Get details of a single inspection.
 * @param {number} id
 */
export async function getInspectionDetail(id) {
  return api.get(`/operator/inspections/${id}`);
}

/**
 * Trigger CV inspection via server SSE broadcast.
 * @param {string} sessionId
 */
export async function triggerCv(sessionId) {
  return api.post('/operator/trigger-cv', { sessionId });
}

/**
 * Submit an online inspection with captured photo (FormData).
 * @param {FormData} formData - Contains image, partId, sessionId
 */
export async function inspectOnline(formData) {
  return api.post('/operator/inspect/online', formData);
}

