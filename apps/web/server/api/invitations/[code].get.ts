import { parseInvitationCode, type InvitationPreview } from '@7trip/shared';

/** Invitation preview, plus whether this browser already joined the trip as a guest. */
export default defineEventHandler(async (event) => {
  const code = parseInvitationCode(getRouterParam(event, 'code') ?? '');
  if (!code) throw createError({ statusCode: 404, message: 'Lien invalide' });
  const preview = await callApi<InvitationPreview>(event, `/invitations/${code}`);
  return { ...preview, joined: !!getCookie(event, guestCookieName(preview.tripId)) };
});
