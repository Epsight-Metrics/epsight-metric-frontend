// Centralized API client — JWT auth, error handling, token management
const API_BASE = '/api';

/**
 * Get the stored JWT token.
 */
function getToken() {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('srs_token');
  }
  return null;
}

/**
 * Custom error class with HTTP status and validation errors.
 */
export class ApiError extends Error {
  constructor(message, status, errors = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

/**
 * Core fetch wrapper with automatic auth headers and error handling.
 * @param {string} endpoint - API path (e.g., '/auth/login')
 * @param {object} options - Fetch options
 * @returns {Promise<any>} Parsed JSON response or Blob for downloads
 */
export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new ApiError('Koneksi jaringan gagal. Periksa koneksi Anda.', 0);
  }

  // Handle binary responses (CSV/PDF export)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/csv') || contentType.includes('application/pdf')) {
    if (!response.ok) throw new ApiError('Export gagal', response.status);
    return response.blob();
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired — clear auth and redirect to login
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('srs_token');
        localStorage.removeItem('srs_user');
      }
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    throw new ApiError(
      data?.message || `Permintaan gagal (${response.status})`,
      response.status,
      data?.errors || null
    );
  }

  return data;
}

/**
 * Build a query string from an object, omitting null/undefined/empty values.
 */
function buildQuery(params) {
  if (!params) return '';
  const filtered = Object.entries(params).filter(
    ([, v]) => v !== null && v !== undefined && v !== ''
  );
  if (filtered.length === 0) return '';
  return '?' + new URLSearchParams(filtered).toString();
}

// Convenience methods
export const api = {
  get: (endpoint, params) => apiFetch(`${endpoint}${buildQuery(params)}`),

  post: (endpoint, body) =>
    apiFetch(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: (endpoint, body) =>
    apiFetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (endpoint, params) =>
    apiFetch(`${endpoint}${buildQuery(params)}`, { method: 'DELETE' }),

  download: (endpoint, params) => apiFetch(`${endpoint}${buildQuery(params)}`),
};
