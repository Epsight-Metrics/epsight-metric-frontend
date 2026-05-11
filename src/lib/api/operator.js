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
