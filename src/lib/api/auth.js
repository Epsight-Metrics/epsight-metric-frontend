// Auth API — login endpoint
import { api } from './client.js';

/**
 * Login with username and password.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{token: string, user: object}>}
 */
export async function login(username, password) {
  return api.post('/auth/login', { username, password });
}
