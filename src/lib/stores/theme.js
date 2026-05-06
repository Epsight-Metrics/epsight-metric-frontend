import { writable } from 'svelte/store';

// We initialize without window.localStorage checking here directly to avoid SSR issues.
// The actual initialization is handled in a small script in app.html to prevent flashing,
// and we just sync it here.

function createThemeStore() {
  const { subscribe, set, update } = writable('dark');

  return {
    subscribe,
    init: () => {
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem('theme') || 'dark';
        set(stored);
        if (stored === 'light') {
          document.documentElement.setAttribute('data-theme', 'light');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      }
    },
    toggle: () => {
      update(current => {
        const next = current === 'dark' ? 'light' : 'dark';
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('theme', next);
          if (next === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
          } else {
            document.documentElement.removeAttribute('data-theme');
          }
        }
        return next;
      });
    }
  };
}

export const theme = createThemeStore();
