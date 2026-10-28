import { authorName, type ContentAuthor } from '@7trip/shared';
import { colors, fontFamily } from '@7trip/ui-tokens';
import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { useTrip } from '@/trips/trips-api';

/** Your own profile, over the current screen so you stay where you were in the trip. */
export const openMyProfile = () => router.push('/profil/nom');

/** Whether a participant of this trip is the signed-in user (a guest has no profile to open). */
export function useIsMe(tripId: string): (participantId: string) => boolean {
  const { status } = useAuth();
  const meId = useTrip(tripId).data?.participants.find((p) => p.isMe)?.id;
  return (participantId) => status === 'signedIn' && participantId === meId;
}

/**
 * A name inside a sentence ("Proposée par …"). Your own name links to your profile; it is meant to
 * sit within an AppText / Text, whose style it keeps.
 */
export function AuthorName({ tripId, author }: { tripId: string; author: ContentAuthor }) {
  const isMe = useIsMe(tripId);
  if (!isMe(author.id)) return <>{authorName(author)}</>;
  return (
    <Text accessibilityRole="link" accessibilityHint="Ouvre ton profil" onPress={openMyProfile} style={styles.me}>
      {author.displayName}
    </Text>
  );
}

const styles = StyleSheet.create({
  me: { fontFamily: fontFamily.bold, color: colors.accent },
});
