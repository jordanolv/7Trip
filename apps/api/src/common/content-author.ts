import { participantAvatarColor, type ContentAuthor } from '@7trip/shared';
import { ParticipantStatus, type Participant } from '../generated/prisma/client.js';

/** A participant as shown next to what they wrote or voted. */
export const toContentAuthor = (participant: Participant): ContentAuthor => ({
  id: participant.id,
  displayName: participant.displayName,
  avatarColor: participantAvatarColor(participant),
  hasLeft: participant.status === ParticipantStatus.LEFT,
});
