import type { TripDetail, TripParticipant } from '@7trip/shared';
import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { SwipeRow, type SwipeAction } from '@/components/swipe-row';
import { AppText } from '@/components/ui/app-text';
import { errorMessage } from '@/lib/api';
import { haptics } from '@/lib/haptics';

import { useRemoveParticipant, useUpdateParticipantRole } from './trips-api';

/** One participant with their role; organizers swipe it (or tap it) to change the role or remove them. */
export function ParticipantRow({ trip, participant }: { trip: TripDetail; participant: TripParticipant }) {
  const updateRole = useUpdateParticipantRole(trip.id);
  const remove = useRemoveParticipant(trip.id);
  const organizer = participant.role === 'ORGANIZER';
  const manageable = trip.myRole === 'ORGANIZER' && !participant.isMe;

  const fail = (title: string) => (error: unknown) => Alert.alert(title, errorMessage(error));
  const toggleRole = () =>
    void updateRole
      .mutateAsync({ participantId: participant.id, role: organizer ? 'PARTICIPANT' : 'ORGANIZER' })
      .then(haptics.success, fail('Impossible de changer le rôle'));
  const confirmRemove = () => {
    haptics.warning();
    Alert.alert(`Retirer ${participant.displayName} ?`, 'Il n’aura plus accès au voyage. Ce qu’il a ajouté reste visible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: () => void remove.mutateAsync(participant.id).catch(fail('Impossible de retirer')) },
    ]);
  };

  const openMenu = () => {
    if (participant.isGuest) {
      confirmRemove();
      return;
    }
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
  const actions: SwipeAction[] =
    manageable && !busy
      ? [
          // A guest needs an account to become organizer.
          ...(participant.isGuest
            ? []
            : [{ icon: organizer ? 'user' : 'crown', label: organizer ? 'Participant' : 'Organisateur', onPress: toggleRole } as const]),
          { icon: 'trash', label: 'Retirer', danger: true, onPress: confirmRemove },
        ]
      : [];
  return (
    <SwipeRow
      variant="inline"
      actions={actions}
      accessibilityLabel={`${participant.displayName}, ${organizer ? 'organisateur' : 'participant'}`}
      onPress={manageable && !busy ? openMenu : undefined}
      style={styles.row}
    >
      <Avatar name={participant.displayName} color={participant.avatarColor} size={36} />
      <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
        {participant.displayName}
        {participant.isMe ? ' (toi)' : ''}
      </AppText>
      {busy ? <ActivityIndicator color={colors.accent} /> : <RoleChip organizer={organizer} guest={participant.isGuest} />}
    </SwipeRow>
  );
}

function RoleChip({ organizer, guest }: { organizer: boolean; guest: boolean }) {
  return (
    <View style={[styles.role, organizer ? styles.roleOrganizer : styles.roleParticipant]}>
      <Text style={[styles.roleText, { color: organizer ? colors.surface : colors.inkTertiary }]}>
        {organizer ? 'Organisateur' : guest ? 'Invité' : 'Participant'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.lg - 2, backgroundColor: colors.surface },
  role: { borderRadius: radii.chip, paddingHorizontal: 9, paddingVertical: 4 },
  roleOrganizer: { backgroundColor: colors.ink },
  roleParticipant: { backgroundColor: colors.chip },
  roleText: { fontFamily: fontFamily.bold, fontSize: 11 },
});
