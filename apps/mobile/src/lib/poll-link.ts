import * as Linking from 'expo-linking';

/**
 * Link shared to vote on a poll (7trip.fr/s/<pollId>). With an invitation code, someone who is not
 * in the trip yet joins it first, then lands on the poll. Same base as invitation links.
 */
export function pollUrl(pollId: string, invitationCode?: string | null): string {
  const base = process.env.EXPO_PUBLIC_INVITE_BASE_URL;
  const query = invitationCode ? `?j=${invitationCode}` : '';
  return base ? `${base.replace(/\/$/, '')}/s/${pollId}${query}` : Linking.createURL(`/s/${pollId}`, { queryParams: invitationCode ? { j: invitationCode } : undefined });
}
