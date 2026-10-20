import { EMAIL_CODE_LENGTH, type CodeSentResponse, type Me } from '@7trip/shared';
import { colors, spacing } from '@7trip/ui-tokens';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { DevCodeBanner } from '@/components/dev-code-banner';
import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { CodeInput } from '@/components/ui/code-input';
import { Icon } from '@/components/ui/icon';
import { useAction } from '@/lib/use-action';

const RESEND_DELAY_SECONDS = 30;

export default function VerifierScreen() {
  const { user, authedRequest, setUser, devEmailCode, setDevEmailCode } = useAuth();
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_DELAY_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const verify = useAction(async (value: string) => {
    const me = await authedRequest<Me>('/auth/verify-email', { method: 'POST', body: { code: value } });
    setUser(me);
    setDevEmailCode(null);
    router.dismissTo('/');
  });

  const resend = useAction(async () => {
    const sent = await authedRequest<CodeSentResponse>('/auth/verify-email/resend', { method: 'POST' });
    setDevEmailCode(sent.devEmailCode);
    setCode('');
    setCooldown(RESEND_DELAY_SECONDS);
  });

  const onChange = (value: string) => {
    setCode(value);
    if (value.length === EMAIL_CODE_LENGTH) void verify.run(value);
  };

  if (!user) {
    return (
      <>
        <ScreenHeader mode="close" />
        <FormScreen>
          <AppText variant="title">Connecte-toi d’abord</AppText>
          <Button title="Se connecter" onPress={() => router.replace('/auth')} />
        </FormScreen>
      </>
    );
  }

  return (
    <>
      <ScreenHeader mode="close" />
      <FormScreen
        footer={
          <Button
            title="Valider"
            loading={verify.loading}
            disabled={code.length !== EMAIL_CODE_LENGTH}
            onPress={() => void verify.run(code)}
          />
        }
      >
        <View style={styles.iconCircle}>
          <Icon name="mail" color={colors.accentInk} size={26} />
        </View>
        <View>
          <AppText variant="title">Vérifie tes emails</AppText>
          <AppText tone="secondary">
            Saisis le code à {EMAIL_CODE_LENGTH} chiffres envoyé à {user.email}. Il est valable 15 minutes.
          </AppText>
        </View>
        <DevCodeBanner code={devEmailCode} />
        <CodeInput value={code} onChange={onChange} hasError={!!verify.error} autoFocus />
        {verify.error || resend.error ? (
          <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
            {verify.error ?? resend.error}
          </AppText>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={cooldown > 0 || resend.loading}
          onPress={() => void resend.run()}
          style={styles.link}
        >
          <AppText variant="bodyStrong" tone={cooldown > 0 ? 'secondary' : 'accent'}>
            {cooldown > 0 ? `Renvoyer un code (${cooldown} s)` : 'Renvoyer un code'}
          </AppText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.dismissTo('/')} style={styles.link}>
          <AppText variant="bodyStrong" tone="secondary">
            Plus tard
          </AppText>
        </Pressable>
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', marginTop: -spacing.sm },
});
