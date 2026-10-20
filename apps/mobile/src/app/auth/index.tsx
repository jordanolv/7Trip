import { emailStatusRequestSchema, type EmailStatusResponse } from '@7trip/shared';
import { colors, spacing } from '@7trip/ui-tokens';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { TextField } from '@/components/ui/text-field';
import { apiRequest } from '@/lib/api';
import { useAction } from '@/lib/use-action';

const SOCIAL_SOON =
  'La connexion avec Apple et Google arrive avec la version installable de l’app. En attendant, utilise ton email.';

export default function ConnexionScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const action = useAction(async () => {
    const parsed = emailStatusRequestSchema.safeParse({ email });
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? 'Adresse email invalide');
      return;
    }
    setEmailError(null);
    const { exists } = await apiRequest<EmailStatusResponse>('/auth/email-status', { method: 'POST', body: parsed.data });
    router.push({ pathname: exists ? '/auth/mot-de-passe' : '/auth/creer-compte', params: { email: parsed.data.email } });
  });

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" bounces={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Image source={require('@/assets/images/connexion.jpg')} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={styles.heroShade} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            onPress={close}
            style={[styles.closeButton, { top: insets.top + spacing.sm }]}
          >
            <Icon name="close" size={20} />
          </Pressable>
          <AppText variant="logo" tone="inverse" style={[styles.heroLogo, { top: insets.top + spacing.md }]}>
            7Trip
          </AppText>
        </View>

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
          <View>
            <AppText variant="title">Bienvenue à bord</AppText>
            <AppText tone="secondary">Connecte-toi ou crée ton compte en quelques secondes.</AppText>
          </View>

          <Button title="Continuer avec Apple" variant="dark" onPress={() => Alert.alert('Bientôt disponible', SOCIAL_SOON)} />
          <Button title="Continuer avec Google" variant="secondary" onPress={() => Alert.alert('Bientôt disponible', SOCIAL_SOON)} />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <AppText variant="caption" tone="secondary">
              ou par email
            </AppText>
            <View style={styles.dividerLine} />
          </View>

          <TextField
            label="Adresse email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError(null);
            }}
            error={emailError ?? action.fieldErrors.email}
            placeholder="toi@exemple.fr"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => void action.run()}
          />
          {action.error ? (
            <AppText variant="caption" tone="danger">
              {action.error}
            </AppText>
          ) : null}
          <Button title="Continuer" loading={action.loading} onPress={() => void action.run()} />

          <AppText variant="caption" tone="secondary" style={styles.legal}>
            Si tu n’as pas encore de compte, on le crée à l’étape suivante. En continuant, tu acceptes les conditions
            et la politique de confidentialité.
          </AppText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  hero: { height: 280 },
  heroShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(14,20,30,0.18)' },
  closeButton: {
    position: 'absolute',
    left: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogo: { position: 'absolute', alignSelf: 'center' },
  sheet: {
    flex: 1,
    marginTop: -40,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl + 2,
    paddingTop: spacing.xl + 6,
    gap: spacing.md + 2,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E3DCCF' },
  legal: { textAlign: 'center' },
});
