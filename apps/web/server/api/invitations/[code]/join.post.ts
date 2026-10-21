import { parseInvitationCode, type GuestJoinResponse } from '@7trip/shared';

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
