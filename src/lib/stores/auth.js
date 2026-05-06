// Auth store — hardcoded users, ready for Express.js integration
import { writable, derived } from 'svelte/store';

// Hardcoded users for development
const MOCK_USERS = [
  { id: 1, username: 'operator1', password: 'pass123', fullname: 'Hadi Santoso', role: 'operator', active: true },
  { id: 2, username: 'admin1', password: 'pass123', fullname: 'Rina Wijaya', role: 'admin', active: true },
  { id: 3, username: 'manager1', password: 'pass123', fullname: 'Siti Nurhaliza', role: 'manager', active: true },
  { id: 4, username: 'auditor1', password: 'pass123', fullname: 'Budi Prasetyo', role: 'auditor', active: true },
];

function createAuthStore() {
  const { subscribe, set, update } = writable({
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null
  });

  return {
    subscribe,

    /**
     * Login with username/password.
     * TODO: Replace with fetch to Express.js backend:
     *   const res = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
     */
    login: async (username, password) => {
      update(s => ({ ...s, loading: true, error: null }));

      // Simulate API delay
      await new Promise(r => setTimeout(r, 800));

      const user = MOCK_USERS.find(u => u.username === username && u.password === password && u.active);

      if (user) {
        const { password: _, ...safeUser } = user;
        set({ user: safeUser, isAuthenticated: true, loading: false, error: null });
        // TODO: Store session token from Express.js response
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('srs_user', JSON.stringify(safeUser));
        }
        return safeUser;
      } else {
        set({ user: null, isAuthenticated: false, loading: false, error: 'Username atau kata sandi salah' });
        return null;
      }
    },

    /**
     * Logout user.
     * TODO: Replace with fetch to Express.js backend:
     *   await fetch('/api/auth/logout', { method: 'POST' });
     */
    logout: () => {
      set({ user: null, isAuthenticated: false, loading: false, error: null });
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('srs_user');
      }
    },

    /**
     * Restore session from localStorage.
     * TODO: Replace with session validation against Express.js:
     *   const res = await fetch('/api/auth/me');
     */
    restore: () => {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('srs_user');
        if (stored) {
          try {
            const user = JSON.parse(stored);
            set({ user, isAuthenticated: true, loading: false, error: null });
            return user;
          } catch {
            localStorage.removeItem('srs_user');
          }
        }
      }
      return null;
    },

    clearError: () => {
      update(s => ({ ...s, error: null }));
    }
  };
}

export const auth = createAuthStore();

// Derived stores for convenience
export const currentUser = derived(auth, $auth => $auth.user);
export const isAuthenticated = derived(auth, $auth => $auth.isAuthenticated);
export const userRole = derived(auth, $auth => $auth.user?.role || null);
