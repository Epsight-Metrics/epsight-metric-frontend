// Auth store — JWT-based authentication against Express.js backend
import { writable, derived } from 'svelte/store';
import { login as apiLogin } from '$lib/api/auth.js';
import { toFrontendRole } from '$lib/utils/roles.js';

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
        const { token, user } = await apiLogin(username, password);

        // Map backend user shape to frontend shape
        const mappedUser = {
          id: user.id,
          username: user.username,
          fullname: user.name,
          role: toFrontendRole(user.role),
          backendRole: user.role,
        };

        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('srs_token', token);
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
    logout: () => {
      set({ user: null, isAuthenticated: false, loading: false, error: null });
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('srs_token');
        localStorage.removeItem('srs_user');
      }
    },

    /**
     * Restore session from localStorage.
     * Token validation happens implicitly on the next API call (401 → redirect).
     */
    restore: () => {
      if (typeof localStorage !== 'undefined') {
        const token = localStorage.getItem('srs_token');
        const stored = localStorage.getItem('srs_user');
        if (token && stored) {
          try {
            const user = JSON.parse(stored);
            set({ user, isAuthenticated: true, loading: false, error: null });
            return user;
          } catch {
            localStorage.removeItem('srs_token');
            localStorage.removeItem('srs_user');
          }
        }
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
