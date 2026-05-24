import { writable } from 'svelte/store';

// In-memory cache store holding { [key]: { data, timestamp } }
const cacheStore = writable({});

export const cache = {
  /**
   * Save data to in-memory cache with current timestamp.
   * @param {string} key - Unique identifier for the query/filters
   * @param {any} data - The API response payload
   */
  set: (key, data) => {
    cacheStore.update((c) => ({
      ...c,
      [key]: {
        data,
        timestamp: Date.now(),
      },
    }));
  },

  /**
   * Retrieve valid cached data (defaults to 30s lifespan).
   * @param {string} key - Unique identifier
   * @param {number} maxAgeMs - Max age in milliseconds (default 30,000ms / 30 seconds)
   * @returns {any|null} The cached payload or null if expired/non-existent
   */
  get: (key, maxAgeMs = 30000) => {
    let result = null;
    cacheStore.update((c) => {
      const entry = c[key];
      if (entry && Date.now() - entry.timestamp < maxAgeMs) {
        result = entry.data;
      } else if (entry) {
        // Remove expired entry to free memory
        const { [key]: _, ...rest } = c;
        return rest;
      }
      return c;
    });
    return result;
  },

  /**
   * Clear all cached API responses.
   */
  clear: () => {
    cacheStore.set({});
  }
};
