import type { TripDetail } from '@7trip/shared';

/** The trip, seen with this browser's guest session. The token itself never reaches the page's JavaScript. */
export default defineEventHandler(async (event) => {
  const tripId = getRouterParam(event, 'tripId') ?? '';
  const token = getCookie(event, guestCookieName(tripId));
  if (!token) throw createError({ statusCode: 404, message: 'Voyage introuvable' });
  try {
    const trip = await callApi<TripDetail>(event, `/trips/${tripId}`, { guestToken: token });
    return { trip, appHandoff: handoffLink(event, tripId, token) };
  } catch (error) {
    // Removed from the trip, or left it from elsewhere: the session is over.
    if ((error as { statusCode?: number }).statusCode === 401) deleteCookie(event, guestCookieName(tripId), { path: '/' });
    throw createError({ statusCode: 404, message: 'Tu ne fais plus partie de ce voyage.' });
  }
});

/** Opens the app with this guest session, so creating an account there keeps everything. */
function handoffLink(event: Parameters<typeof useRuntimeConfig>[0], tripId: string, token: string) {
  const { appLink } = useRuntimeConfig(event).public;
  return `${appLink}reprendre?${new URLSearchParams({ voyage: tripId, jeton: token }).toString()}`;
}
