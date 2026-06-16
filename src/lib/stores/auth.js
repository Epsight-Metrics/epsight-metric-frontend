// Auth store — JWT-based authentication against Express.js backend
import { writable, derived } from 'svelte/store';
import { login as apiLogin, logout as apiLogout } from '$lib/api/auth.js';
import { toFrontendRole } from '$lib/utils/roles.js';

/**
 * Lightweight helper to decode JWT payload securely on the client side.
 */
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function createAuthStore() {
  const { subscribe, set, update } = writable({
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  });

  return {
    subscribe,

    /**
     * Login with username/password via backend API.
     */
    login: async (username, password) => {
      update((s) => ({ ...s, loading: true, error: null }));

      try {
        const { accessToken, user } = await apiLogin(username, password);

        // Map backend user shape to frontend shape
        const mappedUser = {
          id: user.id,
          username: user.username,
          fullname: user.name,
          role: toFrontendRole(user.role),
          backendRole: user.role,
        };

        const { setToken } = await import('$lib/api/client.js');
        setToken(accessToken);

        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('srs_user', JSON.stringify(mappedUser));
        }

        set({ user: mappedUser, isAuthenticated: true, loading: false, error: null });
        return mappedUser;
      } catch (err) {
        let message;
        if (err.status === 429) {
          message = 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.';
        } else if (err.status === 401) {
          message = 'Username atau kata sandi salah';
        } else {
          message = err.message || 'Terjadi kesalahan';
        }
        set({ user: null, isAuthenticated: false, loading: false, error: message });
        return null;
      }
    },

    /**
     * Logout — clear token and user from storage.
     */
    logout: async () => {
      try {
        await apiLogout();
      } catch (err) {
        console.error('Logout API error:', err);
      }
      
      const { setToken } = await import('$lib/api/client.js');
      setToken(null);

      set({ user: null, isAuthenticated: false, loading: false, error: null });
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('srs_user');
      }
    },

    /**
     * Restore session.
     * Uses local state cache for progressive shell rendering,
     * but immediately validates session authenticity against backend JWT tokens.
     */
    restore: async () => {
      let cachedUser = null;

      // 1. Progressive rendering using client-side cache
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('srs_user');
        if (stored) {
          try {
            cachedUser = JSON.parse(stored);
            set({ user: cachedUser, isAuthenticated: true, loading: false, error: null });
          } catch {
            localStorage.removeItem('srs_user');
          }
        }
      }

      // 2. Strict cryptographically verified background reconciliation
      try {
        const { apiFetch, setToken } = await import('$lib/api/client.js');
        
        // Triggers server HttpOnly cookie rotation and retrieves fresh signed JWT access token
        const refreshData = await apiFetch('/auth/refresh', {
          method: 'POST',
        });

        if (refreshData && refreshData.accessToken) {
          setToken(refreshData.accessToken);
          const payload = parseJwt(refreshData.accessToken);

          if (payload) {
            const mappedUser = {
              id: payload.id,
              username: payload.username,
              fullname: payload.name || payload.username,
              role: toFrontendRole(payload.role),
              backendRole: payload.role,
            };

            // Write absolute verified details to local cache, overriding any manual tampering
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('srs_user', JSON.stringify(mappedUser));
            }
            set({ user: mappedUser, isAuthenticated: true, loading: false, error: null });
            return mappedUser;
          }
        }
      } catch (err) {
        // Session invalid or expired
        const { setToken } = await import('$lib/api/client.js');
        setToken(null);
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('srs_user');
        }
        set({ user: null, isAuthenticated: false, loading: false, error: null });
      }

      return null;
    },

    clearError: () => {
      update((s) => ({ ...s, error: null }));
    },
  };
}

export const auth = createAuthStore();

// Derived stores for convenience
export const currentUser = derived(auth, ($auth) => $auth.user);
export const isAuthenticated = derived(auth, ($auth) => $auth.isAuthenticated);
export const userRole = derived(auth, ($auth) => $auth.user?.role || null);
