import { canDo, type TripDetail, type TripParticipant } from '@7trip/shared';
import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { ApiError } from '@/lib/api';
import { invitationUrl } from '@/lib/invitation-link';
import { TripQueryState } from '@/trips/trip-query-state';
import {
  useInvitation,
  useLeaveTrip,
  useRemoveParticipant,
  useRenewInvitation,
  useTrip,
  useUpdateParticipantRole,
} from '@/trips/trips-api';
import { useTripId } from '@/trips/use-trip-id';

export default function ParticipantsScreen() {
  const query = useTrip(useTripId());
  return <TripQueryState query={query}>{(trip) => <Participants trip={trip} />}</TripQueryState>;
}

const errorMessage = (error: unknown) => (error instanceof ApiError ? error.message : 'Réessaie dans un instant.');

function Participants({ trip }: { trip: TripDetail }) {
  const isOrganizer = trip.myRole === 'ORGANIZER';
  const canInvite = canDo('invite', trip.myRole, trip);
  const leave = useLeaveTrip(trip.id);

  const confirmLeave = () =>
    Alert.alert(`Quitter « ${trip.title} » ?`, 'Tu n’y auras plus accès. Ce que tu as ajouté reste visible des autres.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Quitter',
        style: 'destructive',
        onPress: () =>
          void leave
            .mutateAsync()
            .then(() => router.dismissTo('/'))
            .catch((error: unknown) => Alert.alert('Impossible de quitter', errorMessage(error))),
      },
    ]);

  return (
    <>
      <ScreenHeader mode="close" title={`Participants · ${trip.participantCount}`} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {canInvite ? (
          <InvitationCard trip={trip} />
        ) : (
          <AppText tone="secondary">Dans ce voyage, seuls les organisateurs peuvent inviter.</AppText>
        )}

        <View style={styles.card}>
          {trip.participants.map((p, index) => (
            <ParticipantRow key={p.id} trip={trip} participant={p} first={index === 0} manageable={isOrganizer && !p.isMe} />
          ))}
        </View>

        <AppText variant="caption" tone="secondary">
          Les organisateurs gèrent le voyage, les rôles et les invitations. Il reste toujours au moins un organisateur.
        </AppText>

        <Pressable accessibilityRole="button" onPress={confirmLeave} style={styles.leave}>
          <Icon name="logout" color={colors.danger} size={20} />
          <AppText variant="bodyStrong" style={{ color: colors.danger }}>
            Quitter le voyage
          </AppText>
        </Pressable>
      </ScrollView>
    </>
  );
}

function InvitationCard({ trip }: { trip: TripDetail }) {
  const invitation = useInvitation(trip.id, true);
  const renew = useRenewInvitation(trip.id);
  const [notice, setNotice] = useState<string | null>(null);
  const canRenew = canDo('renewInvitation', trip.myRole, trip);
  const url = invitation.data ? invitationUrl(invitation.data.code) : null;

  const copy = async () => {
    if (!url) return;
    await Clipboard.setStringAsync(url);
    setNotice('Lien copié.');
  };
  const share = () => {
    if (url) void Share.share({ message: `Rejoins mon voyage « ${trip.title} » sur 7Trip : ${url}` });
  };
  const confirmRenew = () =>
    Alert.alert('Renouveler le lien ?', 'L’ancien lien ne fonctionnera plus. Les participants actuels restent dans le voyage.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Renouveler',
        style: 'destructive',
        onPress: () =>
          void renew
            .mutateAsync()
            .then(() => setNotice('Nouveau lien créé. L’ancien ne fonctionne plus.'))
            .catch((error: unknown) => Alert.alert('Impossible de renouveler', errorMessage(error))),
      },
    ]);

  return (
    <View style={[styles.card, styles.invite]}>
      <View style={styles.inviteHeader}>
        <View style={styles.inviteIcon}>
          <Icon name="link" color={colors.accentInk} size={20} />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">Lien d’invitation</AppText>
          <AppText variant="caption" tone="secondary">
            {trip.invitePolicy === 'ALL' ? 'Tout le monde peut inviter' : 'Seuls les organisateurs invitent'}
          </AppText>
        </View>
      </View>

      <View style={styles.linkBox}>
        {invitation.data ? (
          <Text selectable numberOfLines={1} style={styles.linkText}>
            {invitation.data.code}
          </Text>
        ) : invitation.isError ? (
          <AppText variant="caption" tone="danger" style={styles.flex}>
            {errorMessage(invitation.error)}
          </AppText>
        ) : (
          <ActivityIndicator color={colors.accent} />
        )}
        <Pressable accessibilityRole="button" onPress={() => void copy()} disabled={!url} style={styles.copy}>
          <Icon name="copy" color={colors.accentInk} size={16} />
          <AppText variant="label" style={{ color: colors.accentInk }}>
            Copier
          </AppText>
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" onPress={share} disabled={!url} style={[styles.shareButton, !url && styles.disabled]}>
        <Icon name="share" color={colors.surface} size={20} />
        <AppText variant="bodyStrong" style={{ color: colors.surface }}>
          Partager le lien
        </AppText>
      </Pressable>

      {canRenew ? (
        <Pressable accessibilityRole="button" onPress={confirmRenew} style={styles.renew}>
          <Icon name="refresh" color={colors.inkTertiary} size={18} />
          <AppText variant="label" style={{ color: colors.inkTertiary }}>
            Révoquer et renouveler
          </AppText>
        </Pressable>
      ) : null}

      {notice ? (
        <AppText variant="caption" style={{ color: colors.accentInk }}>
          {notice}
        </AppText>
      ) : null}
    </View>
  );
}

function ParticipantRow({
  trip,
  participant,
  first,
  manageable,
}: {
  trip: TripDetail;
  participant: TripParticipant;
  first: boolean;
  manageable: boolean;
}) {
  const updateRole = useUpdateParticipantRole(trip.id);
  const remove = useRemoveParticipant(trip.id);
  const organizer = participant.role === 'ORGANIZER';

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
      style={[styles.row, !first && styles.rowSeparator]}
    >
      <Avatar name={participant.displayName} size={40} />
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
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  flex: { flex: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radii.card },
  invite: { padding: spacing.lg, gap: spacing.md },
  inviteHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingLeft: spacing.md + 2,
    paddingRight: spacing.xs,
    borderRadius: 14,
    backgroundColor: colors.chipSoft,
  },
  linkText: { flex: 1, fontFamily: fontFamily.semibold, fontSize: 16, letterSpacing: 1, color: colors.ink },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: spacing.md, borderRadius: 10, backgroundColor: colors.accentTint },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.accent,
  },
  disabled: { opacity: 0.5 },
  renew: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64, paddingHorizontal: spacing.lg },
  rowSeparator: { borderTopWidth: 1, borderTopColor: colors.separator },
  role: { borderRadius: radii.chip, paddingHorizontal: 9, paddingVertical: 4 },
  roleOrganizer: { backgroundColor: colors.ink },
  roleParticipant: { backgroundColor: colors.chip },
  roleText: { fontFamily: fontFamily.bold, fontSize: 11 },
  leave: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.dangerTint,
  },
});
