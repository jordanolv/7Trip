import { deleteAccountRequestSchema } from '@7trip/shared';
import { colors, spacing } from '@7trip/ui-tokens';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { Sheet } from '@/components/sheet';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useAction } from '@/lib/use-action';

const CONSEQUENCES = [
  'Ton compte, tes documents privés, tes dépenses personnelles et ton budget sont effacés.',
  'Dans les voyages de groupe, tu deviens « Ancien participant » : les dépenses partagées, idées et votes restent, pour que les comptes du groupe tombent juste.',
  'Les voyages où il ne reste personne d’autre avec un compte sont supprimés.',
  'Si tu étais le seul organisateur, le participant arrivé le plus tôt le devient.',
];

/** RGPD deletion (docs/architecture.md §11): asks for the password again, then signs out. */
export default function SupprimerCompteScreen() {
  const { user, authedRequest, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const needsPassword = user?.hasPassword ?? true;

  const remove = useAction(async () => {
    const body = deleteAccountRequestSchema.parse(needsPassword ? { password } : {});
    await authedRequest('/me', { method: 'DELETE', body });
    await signOut();
    router.back();
    Alert.alert('Compte supprimé', 'Tes données personnelles ont été effacées.');
  });

  return (
    <Sheet title="Supprimer mon compte">
      <AppText tone="secondary">C’est définitif, et rien ne pourra être récupéré :</AppText>
      <View style={styles.list}>
        {CONSEQUENCES.map((line) => (
          <View key={line} style={styles.item}>
            <View style={styles.bullet} />
            <AppText style={styles.flex}>{line}</AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" tone="secondary">
        Tu peux d’abord récupérer une copie avec « Exporter mes données ».
      </AppText>
      {needsPassword ? (
        <TextField
          label="Ton mot de passe, pour confirmer"
          value={password}
          onChangeText={setPassword}
          error={remove.fieldErrors.password ?? remove.error}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="done"
        />
      ) : remove.error ? (
        <AppText style={{ color: colors.danger }}>{remove.error}</AppText>
      ) : null}
      <Button
        title="Supprimer définitivement"
        variant="danger"
        loading={remove.loading}
        disabled={needsPassword && !password}
        onPress={() => void remove.run()}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: spacing.sm },
  item: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 9, backgroundColor: colors.inkTertiary },
});
