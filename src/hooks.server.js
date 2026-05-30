import { error } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  const { request } = event;
  const method = request.method;

  // Enforce CSRF protection on SvelteKit routes for state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');

    if (origin) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          throw error(403, 'CSRF protection: Cross-origin request blocked');
        }
      } catch (err) {
        throw error(403, 'CSRF protection: Invalid Origin header');
      }
    } else if (referer) {
      try {
        const refererUrl = new URL(referer);
        if (refererUrl.host !== host) {
          throw error(403, 'CSRF protection: Cross-origin referrer blocked');
        }
      } catch (err) {
        throw error(403, 'CSRF protection: Invalid Referer header');
      }
    } else {
      // State-changing requests from a browser should have Origin or Referer
      throw error(403, 'CSRF protection: Missing Origin/Referer header');
    }
  }

  return resolve(event);
}
