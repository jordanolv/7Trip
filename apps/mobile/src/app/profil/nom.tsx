import { updateMeRequestSchema, type Me } from '@7trip/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useAction } from '@/lib/use-action';

export default function ModifierNomScreen() {
  const { user, authedRequest, setUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [localError, setLocalError] = useState<string | null>(null);

  const save = useAction(async () => {
    const parsed = updateMeRequestSchema.safeParse({ displayName });
    if (!parsed.success) {
      setLocalError(parsed.error.issues[0]?.message ?? 'Nom invalide');
      return;
    }
    setLocalError(null);
    setUser(await authedRequest<Me>('/me', { method: 'PATCH', body: parsed.data }));
    router.back();
  });

  return (
    <>
      <ScreenHeader mode="close" title="Mon profil" />
      <FormScreen footer={<Button title="Enregistrer" loading={save.loading} onPress={() => void save.run()} />}>
        <View>
          <AppText variant="title">Comment t’appelle-t-on ?</AppText>
          <AppText tone="secondary">Ce nom est visible par les personnes de tes voyages.</AppText>
        </View>
        <TextField
          label="Prénom ou pseudo"
          value={displayName}
          onChangeText={setDisplayName}
          error={localError ?? save.fieldErrors.displayName ?? save.error}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => void save.run()}
        />
      </FormScreen>
    </>
  );
}
