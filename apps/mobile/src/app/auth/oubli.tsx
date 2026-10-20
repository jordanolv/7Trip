import {
  EMAIL_CODE_LENGTH,
  PASSWORD_MIN_LENGTH,
  forgotPasswordRequestSchema,
  type AuthResponse,
  type CodeSentResponse,
} from '@7trip/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { DevCodeBanner } from '@/components/dev-code-banner';
import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { CodeInput } from '@/components/ui/code-input';
import { TextField } from '@/components/ui/text-field';
import { apiRequest } from '@/lib/api';
import { useAction } from '@/lib/use-action';

export default function OubliScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { signIn } = useAuth();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const requestCode = useAction(async () => {
    const parsed = forgotPasswordRequestSchema.safeParse({ email });
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? 'Adresse email invalide');
      return;
    }
    setEmailError(null);
    const sent = await apiRequest<CodeSentResponse>('/auth/forgot-password', { method: 'POST', body: parsed.data });
    setEmail(parsed.data.email);
    setDevCode(sent.devEmailCode ?? null);
    setStep('reset');
  });

  const reset = useAction(async () => {
    const session = await apiRequest<AuthResponse>('/auth/reset-password', {
      method: 'POST',
      body: { email, code, password },
    });
    await signIn(session);
    router.dismissTo('/');
  });

  if (step === 'email') {
    return (
      <>
        <ScreenHeader />
        <FormScreen footer={<Button title="Recevoir un code" loading={requestCode.loading} onPress={() => void requestCode.run()} />}>
          <View>
            <AppText variant="title">Mot de passe oublié</AppText>
            <AppText tone="secondary">On t’envoie un code pour choisir un nouveau mot de passe.</AppText>
          </View>
          <TextField
            label="Adresse email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError(null);
            }}
            error={emailError ?? requestCode.fieldErrors.email ?? requestCode.error}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
          />
        </FormScreen>
      </>
    );
  }

  return (
    <>
      <ScreenHeader />
      <FormScreen
        footer={
          <Button
            title="Changer mon mot de passe"
            loading={reset.loading}
            disabled={code.length !== EMAIL_CODE_LENGTH || password.length < PASSWORD_MIN_LENGTH}
            onPress={() => void reset.run()}
          />
        }
      >
        <View>
          <AppText variant="title">Nouveau mot de passe</AppText>
          <AppText tone="secondary">
            Si un compte existe pour {email}, un code vient d’y être envoyé.
          </AppText>
        </View>
        <DevCodeBanner code={devCode} />
        <View style={{ gap: 6 }}>
          <AppText variant="label">Code reçu par email</AppText>
          <CodeInput value={code} onChange={setCode} hasError={reset.error !== null} autoFocus />
        </View>
        <TextField
          label="Nouveau mot de passe"
          hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères.`}
          value={password}
          onChangeText={setPassword}
          error={reset.fieldErrors.password}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        {reset.error ? (
          <AppText variant="caption" tone="danger">
            {reset.error}
          </AppText>
        ) : null}
      </FormScreen>
    </>
  );
}
