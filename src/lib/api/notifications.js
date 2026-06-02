// SSE Notifications — real-time event stream
import { getToken } from '$lib/api/client.js';

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : '/api';

/**
 * Create an SSE connection to the notifications stream.
 * @param {function} onMessage - Callback for incoming events: (eventType, data) => void
 * @param {function} onError - Callback for errors
 * @returns {EventSource} The EventSource instance (call .close() to disconnect)
 */
export function connectSSE(onMessage, onError) {
  // Ambil token dari memory (bukan localStorage — access token disimpan di memory)
  const token = getToken();
  if (!token) {
    console.warn('No auth token for SSE connection');
    return null;
  }

  // EventSource tidak support custom headers, kirim token via query param
  const url = `${API_BASE}/notifications/stream?token=${encodeURIComponent(token)}`;
  const eventSource = new EventSource(url);

  eventSource.addEventListener('inspection-update', (e) => {
    try {
      const data = JSON.parse(e.data);
      onMessage('inspection-update', data);
    } catch (err) {
      console.error('Failed to parse inspection-update:', err);
    }
  });

  eventSource.addEventListener('ng-alert', (e) => {
    try {
      const data = JSON.parse(e.data);
      onMessage('ng-alert', data);
    } catch (err) {
      console.error('Failed to parse ng-alert:', err);
    }
  });

  eventSource.addEventListener('cv-trigger', (e) => {
    try {
      const data = JSON.parse(e.data);
      onMessage('cv-trigger', data);
    } catch (err) {
      console.error('Failed to parse cv-trigger:', err);
    }
  });

  eventSource.addEventListener('reference-update', (e) => {
    try {
      const data = JSON.parse(e.data);
      onMessage('reference-update', data);
    } catch (err) {
      console.error('Failed to parse reference-update:', err);
    }
  });

  eventSource.onerror = (err) => {
    console.error('SSE connection error:', err);
    if (onError) onError(err);
  };

  return eventSource;
}
