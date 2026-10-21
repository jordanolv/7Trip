import { z } from 'zod';

import { PARTICIPANT_ROLES, type InvitePolicy, type ParticipantRole, type TripColorKey, type TripIconKey } from './trips.js';

/**
 * Permission matrix of a trip (docs/architecture.md §5), shared so the app only shows what the API
 * will accept. Guests arrive with step 3.
 */
export type TripAction =
  | 'invite'
  | 'renewInvitation'
  | 'manageParticipants'
  | 'editTrip'
  | 'deleteTrip';

export function canDo(action: TripAction, role: ParticipantRole, trip: { invitePolicy: InvitePolicy }): boolean {
  if (role === 'ORGANIZER') return true;
  return action === 'invite' && trip.invitePolicy === 'ALL';
}

/** Invitation codes: lowercase letters and digits, without look-alikes (0/o, 1/l/i). */
export const INVITATION_CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export const INVITATION_CODE_LENGTH = 10;

/** Accepts a bare code or a pasted link ending with /j/<code>. */
export function parseInvitationCode(input: string): string | null {
  const match = /(?:\/j\/)?([a-z0-9]+)\/?\s*$/i.exec(input.trim());
  const code = match?.[1]?.toLowerCase();
  if (!code || code.length !== INVITATION_CODE_LENGTH) return null;
  return [...code].every((c) => INVITATION_CODE_ALPHABET.includes(c)) ? code : null;
}

export const updateParticipantRequestSchema = z.object({ role: z.enum(PARTICIPANT_ROLES) });
export type UpdateParticipantRequest = z.input<typeof updateParticipantRequestSchema>;

export interface TripInvitation {
  code: string;
  createdAt: string;
}

/** What someone sees before joining a trip. */
export interface InvitationPreview {
  code: string;
  tripId: string;
  title: string;
  destinations: string[];
  startDate: string | null;
  endDate: string | null;
  color: TripColorKey;
  icon: TripIconKey;
  participantCount: number;
  /** First names of the organizers, to know who invites. */
  organizers: string[];
  alreadyMember: boolean;
}
