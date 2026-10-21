import { parseInvitationCode, type InvitationPreview } from '@7trip/shared';

/** Invitation preview, plus whether this browser is still in the trip as a guest. */
export default defineEventHandler(async (event) => {
  const code = parseInvitationCode(getRouterParam(event, 'code') ?? '');
  if (!code) throw createError({ statusCode: 404, message: 'Lien invalide' });
  const preview = await callApi<InvitationPreview>(event, `/invitations/${code}`);
  return { ...preview, joined: await hasLiveSession(event, preview.tripId) };
});

/**
 * A cookie alone is not enough: the session may have ended (removed, left from the app, claimed
 * by an account). An ended one must lead to the join form, not to a trip it no longer opens.
 */
async function hasLiveSession(event: Parameters<typeof getCookie>[0], tripId: string): Promise<boolean> {
  const token = getCookie(event, guestCookieName(tripId));
  if (!token) return false;
  return callApi(event, `/trips/${tripId}`, { guestToken: token }).then(
    () => true,
    () => false,
  );
}
