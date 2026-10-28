import { formatDayMonth, formatMoney, localIsoDate, type ContentAuthor, type SuggestedTransfer, type TripBalances } from '@7trip/shared';
import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { errorMessage } from '@/lib/api';
import { haptics } from '@/lib/haptics';

import { useSettle, useUnsettle } from './finances-api';

/**
 * Who pays whom to be square, then the detail per person (CDC §8.2). "C'est réglé" is for the two
 * people concerned and the organizers, like the API.
 */
export function BalancesView({ tripId, balances, meId, organizer }: { tripId: string; balances: TripBalances; meId: string; organizer: boolean }) {
  const settle = useSettle(tripId);
  const unsettle = useUnsettle(tripId);
  const { currency } = balances;
  const name = (p: ContentAuthor) => (p.id === meId ? 'toi' : p.displayName);
  const money = (minor: number) => formatMoney(minor, currency);

  const sentence = (t: SuggestedTransfer) =>
    t.from.id === meId ? `Tu dois à ${t.to.displayName}` : t.to.id === meId ? `${t.from.displayName} te doit` : `${t.from.displayName} doit à ${t.to.displayName}`;

  const confirmSettle = (t: SuggestedTransfer) => {
    const amount = money(t.amountMinor);
    const question =
      t.to.id === meId
        ? `${t.from.displayName} t’a remboursé ${amount} ?`
        : t.from.id === meId
          ? `Tu as remboursé ${amount} à ${t.to.displayName} ?`
          : `${t.from.displayName} a remboursé ${amount} à ${t.to.displayName} ?`;
    Alert.alert('C’est réglé ?', question, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'C’est réglé',
        onPress: () =>
          settle.mutate(
            { fromId: t.from.id, toId: t.to.id, amountMinor: t.amountMinor },
            { onSuccess: () => haptics.success(), onError: (error) => Alert.alert('Impossible d’enregistrer', errorMessage(error)) },
          ),
      },
    ]);
  };

  const confirmUnsettle = (id: string) =>
    Alert.alert('Annuler ce remboursement ?', 'Le solde redeviendra dû.', [
      { text: 'Garder', style: 'cancel' },
      { text: 'Annuler le remboursement', style: 'destructive', onPress: () => unsettle.mutate(id, { onError: (error) => Alert.alert('Impossible d’annuler', errorMessage(error)) }) },
    ]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.section}>
        <AppText variant="heading">Pour être quittes</AppText>
        {balances.transfers.length === 0 ? (
          <View style={styles.square}>
            <Icon name="check" color={colors.accentInk} size={20} />
            <AppText tone="secondary" style={styles.flex}>
              {balances.sharedCount ? 'Tout le monde est quitte.' : 'Rien à rembourser pour l’instant : ajoute une dépense partagée.'}
            </AppText>
          </View>
        ) : (
          balances.transfers.map((t) => {
            const canSettle = organizer || t.from.id === meId || t.to.id === meId;
            const pending = settle.isPending && settle.variables?.fromId === t.from.id && settle.variables.toId === t.to.id;
            return (
              <View key={`${t.from.id}-${t.to.id}`} style={styles.transfer}>
                <View style={styles.pair}>
                  <Avatar name={t.from.displayName} color={t.from.avatarColor} size={34} />
                  <Icon name="arrowRight" color={colors.inkSecondary} size={16} />
                  <Avatar name={t.to.displayName} color={t.to.avatarColor} size={34} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong" numberOfLines={2}>
                    {sentence(t)}
                  </AppText>
                  <Text style={styles.transferAmount}>{money(t.amountMinor)}</Text>
                </View>
                {canSettle ? (
                  <Pressable accessibilityRole="button" disabled={settle.isPending} onPress={() => confirmSettle(t)} style={styles.settle}>
                    {pending ? <ActivityIndicator color={colors.accentInk} /> : <Text style={styles.settleText}>C’est réglé</Text>}
                  </Pressable>
                ) : null}
              </View>
            );
          })
        )}
      </View>

      {balances.settlements.length ? (
        <View style={styles.section}>
          <AppText variant="label" tone="secondary">
            Remboursements faits
          </AppText>
          <View style={styles.card}>
            {balances.settlements.map((s, index) => (
              <View key={s.id} style={[styles.settled, index > 0 && styles.rowBorder]}>
                <Icon name="check" color={colors.accentInk} size={18} />
                <AppText variant="caption" style={styles.flex}>
                  {s.from.id === meId ? 'Tu as' : `${s.from.displayName} a`} remboursé {money(s.amountMinor)} à {name(s.to)} ·{' '}
                  {formatDayMonth(localIsoDate(new Date(s.createdAt)))}
                </AppText>
                {s.canDelete ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Annuler ce remboursement" hitSlop={8} onPress={() => confirmUnsettle(s.id)}>
                    <Icon name="undo" color={colors.inkSecondary} size={18} />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText variant="label" tone="secondary">
          Détail par personne
        </AppText>
        <View style={styles.card}>
          <View style={[styles.tableRow, styles.tableHead]}>
            <Text style={[styles.headCell, styles.nameCell]}>Qui</Text>
            <Text style={styles.headCell}>A avancé</Text>
            <Text style={styles.headCell}>Coût réel</Text>
            <Text style={styles.headCell}>Solde</Text>
          </View>
          {balances.people.map((p) => (
            <View key={p.participant.id} style={[styles.tableRow, styles.rowBorder]}>
              <Text style={[styles.cell, styles.nameCell, styles.nameText]} numberOfLines={1}>
                {p.participant.id === meId ? 'Toi' : p.participant.displayName}
                {p.participant.hasLeft ? ' (parti)' : ''}
              </Text>
              <Text style={styles.cell}>{money(p.paidMinor)}</Text>
              <Text style={styles.cell}>{money(p.costMinor)}</Text>
              <Text style={[styles.cell, styles.balance, p.balanceMinor > 0 && styles.positive, p.balanceMinor < 0 && styles.negative]}>
                {p.balanceMinor > 0 ? '+ ' : ''}
                {money(p.balanceMinor)}
              </Text>
            </View>
          ))}
        </View>
        <AppText variant="caption" tone="secondary">
          Solde = ce que tu as avancé − ce que tu as réellement consommé. Positif : on te doit de l’argent.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xl },
  flex: { flex: 1, minWidth: 0 },
  section: { gap: spacing.sm },
  square: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.accentTint, borderRadius: 16, padding: spacing.md },
  transfer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: 18, padding: spacing.md },
  pair: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  transferAmount: { fontFamily: fontFamily.extrabold, fontSize: 17, color: colors.ink, marginTop: 2 },
  settle: { minHeight: 40, paddingHorizontal: 12, borderRadius: radii.chip, backgroundColor: colors.accentTint, justifyContent: 'center' },
  settleText: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.accentInk },
  card: { backgroundColor: colors.surface, borderRadius: 18, paddingHorizontal: spacing.md },
  settled: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 8 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.separator },
  tableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 6 },
  tableHead: { minHeight: 36 },
  headCell: { flex: 1, textAlign: 'right', fontFamily: fontFamily.bold, fontSize: 11, color: colors.inkSecondary },
  nameCell: { flex: 1.1, textAlign: 'left' },
  cell: { flex: 1, textAlign: 'right', fontFamily: fontFamily.medium, fontSize: 12, color: colors.inkTertiary },
  nameText: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.ink },
  balance: { fontFamily: fontFamily.bold },
  positive: { color: colors.accentInk },
  negative: { color: colors.danger },
});
