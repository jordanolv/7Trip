import { PASSWORD_MIN_LENGTH, registerRequestSchema, type AuthResponse } from '@7trip/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { View, type TextInputInstance } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { apiRequest } from '@/lib/api';
import { useAction } from '@/lib/use-action';

export default function CreerCompteScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const { signIn, setDevEmailCode } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const passwordInput = useRef<TextInputInstance>(null);

  const action = useAction(async () => {
    const parsed = registerRequestSchema.safeParse({ email, displayName, password });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
      setLocalErrors(errors);
      return;
    }
    setLocalErrors({});
    const session = await apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: parsed.data });
    await signIn(session);
    setDevEmailCode(session.devEmailCode);
    router.replace('/auth/verifier');
  });

  const errors = { ...action.fieldErrors, ...localErrors };

  return (
    <>
      <ScreenHeader />
      <FormScreen footer={<Button title="Créer mon compte" loading={action.loading} onPress={() => void action.run()} />}>
        <View>
          <AppText variant="title">Créons ton compte</AppText>
          <AppText tone="secondary">{email}</AppText>
        </View>
        <TextField
          label="Prénom ou pseudo"
          hint="Visible par les personnes de tes voyages."
          value={displayName}
          onChangeText={setDisplayName}
          error={errors.displayName}
          autoFocus
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="next"
          onSubmitEditing={() => passwordInput.current?.focus()}
        />
        <TextField
          ref={passwordInput}
          label="Mot de passe"
          hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères.`}
          value={password}
          onChangeText={setPassword}
          error={errors.password ?? errors.email}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={() => void action.run()}
        />
        {action.error ? (
          <AppText variant="caption" tone="danger">
            {action.error}
          </AppText>
        ) : null}
      </FormScreen>
    </>
  );
}
