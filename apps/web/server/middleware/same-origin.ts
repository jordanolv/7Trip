/**
 * Refuses form posts sent from another site. A cross-site top-level POST arrives without our
 * SameSite=Lax cookies, yet its response may still set one: a page elsewhere could make a visitor
 * join again and lose the guest cookie of their first participation (or leave a trip). Browsers
 * always send Origin on a POST; a request without it does not come from a browser, so it holds no
 * cookie worth protecting.
 */
export default defineEventHandler((event) => {
  if (event.method === 'GET' || event.method === 'HEAD') return;
  const origin = getRequestHeader(event, 'origin');
  if (origin === undefined) return;
  if (originHost(origin) !== getRequestHost(event)) {
    throw createError({ statusCode: 403, message: 'Cette demande ne vient pas de 7Trip.' });
  }
});

/** The host of an Origin header, or null for "null" (sandboxed, opaque) and malformed values. */
function originHost(origin: string): string | null {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
}
