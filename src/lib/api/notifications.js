// SSE Notifications — real-time event stream
const API_BASE = '/api';

/**
 * Create an SSE connection to the notifications stream.
 * @param {function} onMessage - Callback for incoming events: (eventType, data) => void
 * @param {function} onError - Callback for errors
 * @returns {EventSource} The EventSource instance (call .close() to disconnect)
 */
export function connectSSE(onMessage, onError) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('srs_token') : null;
  if (!token) {
    console.warn('No auth token for SSE connection');
    return null;
  }

  // EventSource doesn't support custom headers, so pass token as query param
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

  eventSource.onerror = (err) => {
    console.error('SSE connection error:', err);
    if (onError) onError(err);
  };

  return eventSource;
}
