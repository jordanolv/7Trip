import { describe, expect, it } from 'vitest';

import { canDo, parseInvitationCode } from './participants.js';

describe('canDo', () => {
  it('lets organizers do everything', () => {
    for (const action of ['invite', 'renewInvitation', 'manageParticipants', 'editTrip', 'deleteTrip'] as const) {
      expect(canDo(action, 'ORGANIZER', { invitePolicy: 'ORGANIZERS' })).toBe(true);
    }
  });

  it('lets participants invite only when the trip allows it', () => {
    expect(canDo('invite', 'PARTICIPANT', { invitePolicy: 'ALL' })).toBe(true);
    expect(canDo('invite', 'PARTICIPANT', { invitePolicy: 'ORGANIZERS' })).toBe(false);
    expect(canDo('renewInvitation', 'PARTICIPANT', { invitePolicy: 'ALL' })).toBe(false);
    expect(canDo('manageParticipants', 'PARTICIPANT', { invitePolicy: 'ALL' })).toBe(false);
    expect(canDo('deleteTrip', 'PARTICIPANT', { invitePolicy: 'ALL' })).toBe(false);
  });

  it('lets guests manage nothing, not even invite', () => {
    expect(canDo('invite', 'PARTICIPANT', { invitePolicy: 'ALL' }, true)).toBe(false);
  });
});

describe('parseInvitationCode', () => {
  it('reads a code or a link', () => {
    expect(parseInvitationCode('k7mz2qpx4r')).toBe('k7mz2qpx4r');
    expect(parseInvitationCode('  K7MZ2QPX4R ')).toBe('k7mz2qpx4r');
    expect(parseInvitationCode('exp://abc.exp.direct/--/j/k7mz2qpx4r')).toBe('k7mz2qpx4r');
    expect(parseInvitationCode('https://7trip.app/j/k7mz2qpx4r/')).toBe('k7mz2qpx4r');
  });

  it('rejects anything else', () => {
    expect(parseInvitationCode('')).toBeNull();
    expect(parseInvitationCode('trop-court')).toBeNull();
    expect(parseInvitationCode('k7mz2qpx40')).toBeNull(); // "0" is not in the alphabet
  });
});
