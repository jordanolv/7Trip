import type { TripDetail } from '@7trip/shared';

/** A shared poll, seen with whichever guest session of this browser is in its trip. */
export default defineEventHandler(async (event) => {
  const pollId = getRouterParam(event, 'pollId') ?? '';
  const session = await findPollSession(event, pollId);
  if (!session) throw createError({ statusCode: 404, message: 'Ce sondage est réservé aux participants du voyage.' });
  const { poll, token } = session;
  const trip = await callApi<TripDetail>(event, `/trips/${poll.tripId}`, { guestToken: token });
  return { poll, trip, appHandoff: handoffLink(event, poll.tripId, token) };
});
