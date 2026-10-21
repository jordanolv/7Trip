import { canDo, type TripDetail } from '@7trip/shared';
import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { errorMessage } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { invitationUrl } from '@/lib/invitation-link';

import { useInvitation, useRenewInvitation } from './trips-api';

/** The trip's invitation link: copy, share and, for organizers, revoke and renew. */
export function InvitationCard({ trip }: { trip: TripDetail }) {
  const invitation = useInvitation(trip.id, true);
  const renew = useRenewInvitation(trip.id);
  const [notice, setNotice] = useState<string | null>(null);
  const canRenew = canDo('renewInvitation', trip.myRole, trip);
  const url = invitation.data ? invitationUrl(invitation.data.code) : null;

  const copy = async () => {
    if (!url) return;
    await Clipboard.setStringAsync(url);
    haptics.success();
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
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}>
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
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
});
