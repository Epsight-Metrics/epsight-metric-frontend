// Auth API — login, refresh, logout endpoints
import { api } from './client.js';

/**
 * Login with username and password.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{accessToken: string, user: object}>}
 */
export async function login(username, password) {
  return api.post('/auth/login', { username, password });
}

/**
 * Refresh the access token using the httpOnly refresh token cookie.
 * @returns {Promise<{accessToken: string}>}
 */
export async function refresh() {
  return api.post('/auth/refresh');
}

/**
 * Logout the user, invalidating the refresh token cookie on the server.
 */
export async function logout() {
  return api.post('/auth/logout');
}
