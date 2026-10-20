import type { AuthResponse } from '@7trip/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { apiRequest } from '@/lib/api';
import { useAction } from '@/lib/use-action';

export default function MotDePasseScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const { signIn } = useAuth();
  const [password, setPassword] = useState('');

  const action = useAction(async () => {
    const session = await apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } });
    await signIn(session);
    if (session.user.emailVerified) router.dismissTo('/');
    else router.replace('/auth/verifier');
  });

  return (
    <>
      <ScreenHeader />
      <FormScreen
        footer={<Button title="Se connecter" loading={action.loading} disabled={!password} onPress={() => void action.run()} />}
      >
        <View>
          <AppText variant="title">Content de te revoir</AppText>
          <AppText tone="secondary">{email}</AppText>
        </View>
        <TextField
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          error={action.error ?? action.fieldErrors.password}
          secureTextEntry
          autoFocus
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => password && void action.run()}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/auth/oubli', params: { email } })}
          style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}
        >
          <AppText variant="bodyStrong" tone="accent">
            Mot de passe oublié ?
          </AppText>
        </Pressable>
      </FormScreen>
    </>
  );
}
