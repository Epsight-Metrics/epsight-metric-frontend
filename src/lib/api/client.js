// Centralized API client — JWT auth, error handling, token management
if (!import.meta.env.VITE_API_URL) {
  throw new Error('VITE_API_URL environment variable is required');
}

const API_BASE = `${import.meta.env.VITE_API_URL}/api`;


let activeToken = null;

export function setToken(token) {
  activeToken = token;
}

export function getToken() {
  // Try to get from cookie first
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)accessToken=([^;]*)/)
    if (match) {
      activeToken = match[1]
    }
  }
  return activeToken;
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
    'X-Requested-With': 'XMLHttpRequest',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions = {
    ...options,
    headers,
    credentials: 'include',
  };

  let response;
  try {
    response = await fetch(url, fetchOptions);
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
    if (response.status === 401 && endpoint !== '/auth/refresh' && endpoint !== '/auth/login' && endpoint !== '/auth/logout') {
      try {
        // Attempt to refresh token
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'include',
        });
        const refreshData = await refreshRes.json().catch(() => null);

        if (refreshRes.ok && refreshData?.accessToken) {
          setToken(refreshData.accessToken);
          // Retry original request
          fetchOptions.headers['Authorization'] = `Bearer ${refreshData.accessToken}`;
          const retryRes = await fetch(url, fetchOptions);

          if (retryRes.headers.get('content-type')?.includes('application/pdf') || retryRes.headers.get('content-type')?.includes('text/csv')) {
            if (!retryRes.ok) throw new ApiError('Export gagal', retryRes.status);
            return retryRes.blob();
          }

          const retryData = await retryRes.json().catch(() => null);
          if (retryRes.ok) return retryData;

          throw new ApiError(
            retryData?.message || `Permintaan gagal (${retryRes.status})`,
            retryRes.status,
            retryData?.errors || null
          );
        } else {
          throw new Error('Refresh failed');
        }
      } catch (err) {
        // Clear session on refresh failure
        setToken(null);
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('srs_user');
        }
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new ApiError('Sesi berakhir, silakan login kembali', 401);
      }
    } else if (response.status === 401) {
      setToken(null);
      if (typeof localStorage !== 'undefined' && endpoint !== '/auth/login' && endpoint !== '/auth/refresh' && endpoint !== '/auth/logout') {
        localStorage.removeItem('srs_user');
      }
      if (typeof window !== 'undefined' && endpoint !== '/auth/login' && endpoint !== '/auth/refresh' && endpoint !== '/auth/logout') {
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
  get: (endpoint, params, options) => apiFetch(`${endpoint}${buildQuery(params)}`, options),

  post: (endpoint, body, options) =>
    apiFetch(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: (endpoint, body, options) =>
    apiFetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
    }),

  delete: (endpoint, params, options) =>
    apiFetch(`${endpoint}${buildQuery(params)}`, { method: 'DELETE', ...options }),

  download: (endpoint, params, options) => apiFetch(`${endpoint}${buildQuery(params)}`, options),
};
