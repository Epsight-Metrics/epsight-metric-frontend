// Admin API — user CRUD, activity logs
import { api } from './client.js';

/**
 * Get users list with optional filters and pagination.
 */
export async function getUsers(params = {}) {
  return api.get('/admin/users', params);
}

/**
 * Create a new user.
 */
export async function createUser(data) {
  return api.post('/admin/users', data);
}

/**
 * Update an existing user.
 * @param {number} id
 * @param {object} data - { name?, role?, password? }
 */
export async function updateUser(id, data) {
  return api.put(`/admin/users/${id}`, data);
}

/**
 * Delete or deactivate a user.
 * @param {number} id
 * @param {boolean} permanent - If true, permanently deletes; otherwise deactivates.
 */
export async function deleteUser(id, permanent = false) {
  const params = permanent ? { action: 'delete' } : {};
  return api.delete(`/admin/users/${id}`, params);
}

/**
 * Get activity logs with optional filters and pagination.
 */
export async function getLogs(params = {}) {
  return api.get('/admin/logs', params);
}
