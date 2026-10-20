import { colors, radii, spacing } from '@7trip/ui-tokens';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { useAuth } from '@/auth/auth-context';
import { Avatar } from '@/components/avatar';
import { TopoLines } from '@/components/topo-lines';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

export default function VoyagesScreen() {
  const { status, user } = useAuth();
  const insets = useSafeAreaInsets();
  const signedIn = status === 'signedIn' && user;

  return (
    <View style={styles.screen}>
      <TopoLines />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.topBar}>
          <AppText variant="logo">7Trip</AppText>
          {signedIn ? (
            <View style={styles.topActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Notifications" style={styles.iconButton}>
                <Icon name="bell" size={24} strokeWidth={1.9} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Profil" onPress={() => router.navigate('/profil')}>
                <Avatar name={user.displayName} />
              </Pressable>
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => router.push('/auth')} style={styles.signInPill}>
              <AppText variant="label">Se connecter</AppText>
            </Pressable>
          )}
        </View>

        <View style={styles.titleRow}>
          <View style={styles.flex}>
            <AppText variant="display">Vos voyages</AppText>
            <AppText tone="secondary">Des idées aujourd’hui, des souvenirs demain</AppText>
          </View>
          {signedIn ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nouveau voyage"
              onPress={() => Alert.alert('Bientôt', 'La création de voyage arrive avec la prochaine étape.')}
              style={styles.addButton}
            >
              <Icon name="plus" color={colors.surface} strokeWidth={2.4} size={24} />
            </Pressable>
          ) : (
            <View
              accessible
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              accessibilityLabel="Nouveau voyage — connexion requise"
              style={styles.addButtonDisabled}
            >
              <Icon name="plus" color="#8C8A84" strokeWidth={2.4} size={24} />
            </View>
          )}
        </View>

        {signedIn ? (
          <>
            {!user.emailVerified ? (
              <Pressable accessibilityRole="button" onPress={() => router.push('/auth/verifier')} style={styles.verifyBanner}>
                <Icon name="mail" color={colors.warningInk} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong" style={{ color: colors.warningInk }}>
                    Confirme ton adresse email
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.warningInk }}>
                    Saisis le code reçu à {user.email}
                  </AppText>
                </View>
                <Icon name="chevronRight" color={colors.warningInk} size={18} />
              </Pressable>
            ) : null}
            <View style={styles.card}>
              <RouteIllustration />
              <View style={styles.cardBody}>
                <AppText variant="heading">Aucun voyage pour l’instant</AppText>
                <AppText tone="secondary">
                  Crée ton premier voyage avec juste un titre : la destination et les dates peuvent se décider plus
                  tard, même par sondage.
                </AppText>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.tooltip}>
              <AppText variant="caption" tone="inverse">
                Un compte est nécessaire pour créer un voyage.
              </AppText>
            </View>
            <View style={styles.card}>
              <RouteIllustration />
              <View style={styles.cardBody}>
                <AppText variant="heading">Ton prochain voyage commence ici</AppText>
                <AppText tone="secondary">
                  Idées, sondages, planning, dépenses et documents : tout ton voyage au même endroit.
                </AppText>
                <Button title="Créer un compte" onPress={() => router.push('/auth')} />
                <Button title="J’ai déjà un compte" variant="soft" onPress={() => router.push('/auth')} />
              </View>
            </View>
            <View style={styles.inviteNote}>
              <Icon name="link" color={colors.inkSecondary} size={20} />
              <AppText variant="caption" tone="secondary" style={styles.flex}>
                Invité par un ami ? Ouvre simplement son lien : tu pourras rejoindre le voyage et voter sans créer de
                compte.
              </AppText>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function RouteIllustration() {
  return (
    <View style={styles.illustration}>
      <Svg width="100%" height="100%" viewBox="0 0 350 170" preserveAspectRatio="xMidYMid slice">
        <G fill="none" stroke="#B9D3C1" strokeWidth={1.5}>
          <Ellipse cx="80" cy="140" rx="120" ry="60" />
          <Ellipse cx="80" cy="140" rx="80" ry="38" />
          <Ellipse cx="290" cy="45" rx="90" ry="44" />
          <Ellipse cx="290" cy="45" rx="56" ry="24" />
        </G>
        <Path
          d="M70 130 C120 80 190 140 240 92 S290 56 290 56"
          fill="none"
          stroke={colors.accentInk}
          strokeWidth={3}
          strokeDasharray="2 9"
          strokeLinecap="round"
        />
        <Circle cx="70" cy="130" r="8" fill={colors.surface} stroke={colors.accentInk} strokeWidth={3} />
        <Path d="M290 70s16-15 16-27a16 16 0 0 0-32 0c0 12 16 27 16 27z" fill="#E0703C" />
        <Circle cx="290" cy="43" r="6" fill={colors.surface} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  signInPill: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.chip,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E3DCCF',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#C9C2B4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltip: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
    maxWidth: 240,
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.warningTint,
  },
  card: { backgroundColor: colors.surface, borderRadius: 24, overflow: 'hidden' },
  illustration: { height: 170, backgroundColor: '#DCEADF' },
  cardBody: { padding: spacing.xl, gap: spacing.md },
  inviteNote: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xs },
});
