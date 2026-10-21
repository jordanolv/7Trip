/**
 * Leaves the trip and forgets the session in this browser. On a failure that may be temporary,
 * the cookie stays (it is the only way back into the trip) and the visitor can try again.
 */
export default defineEventHandler(async (event) => {
  const tripId = getRouterParam(event, 'tripId') ?? '';
  const token = getCookie(event, guestCookieName(tripId));
  if (token) {
    try {
      await callApi(event, `/trips/${tripId}/leave`, { method: 'POST', guestToken: token });
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      // 401 / 404: the session had already ended, so there is nothing left to keep.
      if (status !== 401 && status !== 404) {
        const message = (error as { message?: string }).message ?? 'Réessaie dans un instant.';
        return sendRedirect(event, `/v/${tripId}?${new URLSearchParams({ erreur: message }).toString()}`, 303);
      }
    }
    deleteCookie(event, guestCookieName(tripId), { path: '/' });
  }
  return sendRedirect(event, '/?parti=1', 303);
});
