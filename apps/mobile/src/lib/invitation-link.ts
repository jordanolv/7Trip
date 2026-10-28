import * as Linking from 'expo-linking';

/**
 * Link shared to invite someone. Until universal links exist on 7trip.fr (needs an EAS build),
 * it opens the app directly: an exp:// link in Expo Go, seventrip:// in a build.
 * Set EXPO_PUBLIC_INVITE_BASE_URL (e.g. https://7trip.fr) to switch to web links.
 */
export function invitationUrl(code: string): string {
  const base = process.env.EXPO_PUBLIC_INVITE_BASE_URL;
  return base ? `${base.replace(/\/$/, '')}/j/${code}` : Linking.createURL(`/j/${code}`);
}

/** Invitation opened while signed out (and the poll it was shared for), to come back to once signed in. */
export interface PendingInvitation {
  code: string;
  pollId?: string;
}

let pending: PendingInvitation | null = null;

export function setPendingInvitation(invitation: PendingInvitation | null) {
  pending = invitation;
}

export function takePendingInvitation(): PendingInvitation | null {
  const invitation = pending;
  pending = null;
  return invitation;
}
