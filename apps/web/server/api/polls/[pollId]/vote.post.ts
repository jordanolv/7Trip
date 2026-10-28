/**
 * Saves the vote. Posted by a plain HTML form (works without JavaScript): the ticked options
 * arrive as `o`, once per option; none at all withdraws the vote. Answers with a redirect to the poll.
 */
export default defineEventHandler(async (event) => {
  const pollId = getRouterParam(event, 'pollId') ?? '';
  const form = await readBody<{ o?: string | string[] }>(event);
  const optionIds = [form?.o ?? []].flat().filter(isUuid);

  try {
    const session = await findPollSession(event, pollId);
    if (!session) return sendRedirect(event, `/s/${encodeURIComponent(pollId)}`, 303);
    await callApi(event, `/trips/${session.poll.tripId}/polls/${pollId}/vote`, {
      method: 'PUT',
      body: { optionIds },
      guestToken: session.token,
    });
    return sendRedirect(event, `/s/${pollId}?${new URLSearchParams({ vote: optionIds.length ? '1' : '0' }).toString()}`, 303);
  } catch (error) {
    const message = (error as { message?: string }).message ?? 'Réessaie dans un instant.';
    return sendRedirect(event, `/s/${encodeURIComponent(pollId)}?${new URLSearchParams({ modifier: '1', erreur: message }).toString()}`, 303);
  }
});
