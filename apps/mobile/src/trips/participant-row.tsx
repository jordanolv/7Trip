import type { TripDetail, TripParticipant } from '@7trip/shared';
import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { errorMessage } from '@/lib/api';

import { useRemoveParticipant, useUpdateParticipantRole } from './trips-api';

/** One participant with their role; organizers tap it to change the role or remove them. */
export function ParticipantRow({ trip, participant }: { trip: TripDetail; participant: TripParticipant }) {
  const updateRole = useUpdateParticipantRole(trip.id);
  const remove = useRemoveParticipant(trip.id);
  const organizer = participant.role === 'ORGANIZER';
  const manageable = trip.myRole === 'ORGANIZER' && !participant.isMe;

  const fail = (title: string) => (error: unknown) => Alert.alert(title, errorMessage(error));
  const toggleRole = () =>
    void updateRole
      .mutateAsync({ participantId: participant.id, role: organizer ? 'PARTICIPANT' : 'ORGANIZER' })
      .catch(fail('Impossible de changer le rôle'));
  const confirmRemove = () =>
    Alert.alert(`Retirer ${participant.displayName} ?`, 'Il n’aura plus accès au voyage. Ce qu’il a ajouté reste visible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: () => void remove.mutateAsync(participant.id).catch(fail('Impossible de retirer')) },
    ]);

  const openMenu = () => {
    const roleLabel = organizer ? 'Repasser participant' : 'Nommer organisateur';
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: participant.displayName, options: [roleLabel, 'Retirer du voyage', 'Annuler'], destructiveButtonIndex: 1, cancelButtonIndex: 2 },
        (index) => (index === 0 ? toggleRole() : index === 1 ? confirmRemove() : undefined),
      );
    } else {
      Alert.alert(participant.displayName, undefined, [
        { text: roleLabel, onPress: toggleRole },
        { text: 'Retirer du voyage', style: 'destructive', onPress: confirmRemove },
        { text: 'Annuler', style: 'cancel' },
      ]);
    }
  };

  const busy = updateRole.isPending || remove.isPending;
  return (
    <Pressable
      accessibilityRole={manageable ? 'button' : undefined}
      accessibilityHint={manageable ? 'Changer le rôle ou retirer' : undefined}
      disabled={!manageable || busy}
      onPress={openMenu}
      style={styles.row}
    >
      <Avatar name={participant.displayName} size={36} />
      <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
        {participant.displayName}
        {participant.isMe ? ' (toi)' : ''}
      </AppText>
      {busy ? <ActivityIndicator color={colors.accent} /> : <RoleChip organizer={organizer} />}
      {manageable ? <Icon name="more" color={colors.inkSecondary} size={18} /> : null}
    </Pressable>
  );
}

function RoleChip({ organizer }: { organizer: boolean }) {
  return (
    <View style={[styles.role, organizer ? styles.roleOrganizer : styles.roleParticipant]}>
      <Text style={[styles.roleText, { color: organizer ? colors.surface : colors.inkTertiary }]}>{organizer ? 'Organisateur' : 'Participant'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.lg - 2 },
  role: { borderRadius: radii.chip, paddingHorizontal: 9, paddingVertical: 4 },
  roleOrganizer: { backgroundColor: colors.ink },
  roleParticipant: { backgroundColor: colors.chip },
  roleText: { fontFamily: fontFamily.bold, fontSize: 11 },
});
