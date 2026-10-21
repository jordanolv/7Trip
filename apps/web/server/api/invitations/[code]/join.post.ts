import { parseInvitationCode, type GuestJoinResponse, type InvitationPreview } from '@7trip/shared';

/**
 * Joins as a guest. Posted by a plain HTML form (works without JavaScript): answers with a
 * redirect, to the trip on success or back to the invitation with the error.
 */
export default defineEventHandler(async (event) => {
  const code = parseInvitationCode(getRouterParam(event, 'code') ?? '');
  if (!code) return sendRedirect(event, '/', 303);
  const form = await readBody<{ displayName?: string }>(event);
  const displayName = String(form?.displayName ?? '');

  try {
    // Already in through this browser (e.g. the form submitted again from another tab): keep that
    // participation and its cookie instead of creating a second guest.
    const { tripId } = await callApi<InvitationPreview>(event, `/invitations/${code}`);
    if (await hasLiveSession(event, tripId)) return sendRedirect(event, `/v/${tripId}`, 303);

    const { token, trip } = await callApi<GuestJoinResponse>(event, `/invitations/${code}/join-guest`, {
      method: 'POST',
      body: { displayName },
    });
    setGuestCookie(event, trip.id, token);
    return sendRedirect(event, `/v/${trip.id}`, 303);
  } catch (error) {
    const message = (error as { message?: string }).message ?? 'Réessaie dans un instant.';
    const query = new URLSearchParams({ erreur: message, nom: displayName });
    return sendRedirect(event, `/j/${code}?${query.toString()}`, 303);
  }
});
