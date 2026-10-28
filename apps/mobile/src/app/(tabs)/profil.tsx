import { colors, radii, spacing } from '@7trip/ui-tokens';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import { Avatar } from '@/components/avatar';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

export default function ProfilScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  if (!user) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}>
        <AppText variant="display">Profil</AppText>
        <View style={styles.card}>
          <View style={styles.cardPadding}>
            <AppText variant="heading">Connecte-toi pour retrouver tes voyages</AppText>
            <AppText tone="secondary">Ton compte garde tes voyages, tes votes et tes dépenses sur tous tes appareils.</AppText>
            <Button title="Se connecter ou créer un compte" onPress={() => router.push('/auth')} />
          </View>
        </View>
      </ScrollView>
    );
  }

  const confirmSignOut = () =>
    Alert.alert('Se déconnecter ?', 'Tu pourras te reconnecter à tout moment.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => void signOut() },
    ]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl }]}>
      <View style={styles.identity}>
        <Avatar name={user.displayName} color={user.avatarColor} size={68} />
        <View style={styles.flex}>
          <AppText variant="title">{user.displayName}</AppText>
          <AppText variant="caption" tone="secondary">
            {user.email}
          </AppText>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/profil/nom')} style={styles.editButton}>
          <AppText variant="label">Modifier</AppText>
        </Pressable>
      </View>

      <Section title="Compte">
        <Row
          label="Email"
          onPress={user.emailVerified ? undefined : () => router.push('/auth/verifier')}
          trailing={
            <View style={[styles.badge, user.emailVerified ? styles.badgeOk : styles.badgeTodo]}>
              <AppText variant="label" style={{ color: user.emailVerified ? colors.accentInk : colors.warningInk, fontSize: 12 }}>
                {user.emailVerified ? 'Vérifié' : 'À confirmer'}
              </AppText>
            </View>
          }
        />
        <Row label="Connexion" trailing={<AppText variant="caption" tone="secondary">Email et mot de passe</AppText>} />
      </Section>

      <Pressable accessibilityRole="button" onPress={confirmSignOut} style={styles.signOut}>
        <Icon name="logout" color={colors.inkTertiary} size={20} />
        <AppText variant="bodyStrong" style={{ color: colors.inkTertiary }}>
          Se déconnecter
        </AppText>
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" tone="secondary" style={styles.sectionTitle}>
        {title}
      </AppText>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ label, trailing, onPress }: { label: string; trailing?: ReactNode; onPress?: () => void }) {
  return (
    <Pressable disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} style={styles.row}>
      <AppText variant="bodyStrong" style={styles.flex}>
        {label}
      </AppText>
      {trailing}
      {onPress ? <Icon name="chevronRight" color={colors.inkSecondary} size={18} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg + 2, paddingBottom: spacing.xxl, gap: spacing.lg },
  flex: { flex: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  editButton: {
    minHeight: 40,
    paddingHorizontal: spacing.md + 2,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  section: { gap: spacing.sm },
  sectionTitle: { marginLeft: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, overflow: 'hidden' },
  cardPadding: { padding: spacing.xl, gap: spacing.md },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg - 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  badge: { borderRadius: radii.chip, paddingHorizontal: 9, paddingVertical: 3 },
  badgeOk: { backgroundColor: colors.accentTint },
  badgeTodo: { backgroundColor: colors.warningTint },
  signOut: {
    alignSelf: 'center',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});
