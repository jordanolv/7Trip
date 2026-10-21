/** Leaves the trip: ends the guest session and forgets it in this browser. */
export default defineEventHandler(async (event) => {
  const tripId = getRouterParam(event, 'tripId') ?? '';
  const token = getCookie(event, guestCookieName(tripId));
  if (token) {
    await callApi(event, `/trips/${tripId}/leave`, { method: 'POST', guestToken: token }).catch(() => undefined);
    deleteCookie(event, guestCookieName(tripId), { path: '/' });
  }
  return sendRedirect(event, '/?parti=1', 303);
});
