import { parseInvitationCode } from '@7trip/shared';
import { router } from 'expo-router';
import { useState } from 'react';

import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';

/** Paste an invitation link or type its code. */
export default function RejoindreScreen() {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();

  const submit = () => {
    const code = parseInvitationCode(value);
    if (!code) {
      setError('Colle le lien reçu, ou ses 10 derniers caractères.');
      return;
    }
    router.replace({ pathname: '/j/[code]', params: { code } });
  };

  return (
    <>
      <ScreenHeader mode="close" title="Rejoindre un voyage" />
      <FormScreen footer={<Button title="Continuer" onPress={submit} />}>
        <AppText variant="title">Tu as reçu une invitation ?</AppText>
        <TextField
          label="Lien ou code d’invitation"
          value={value}
          onChangeText={(text) => {
            setValue(text);
            setError(undefined);
          }}
          placeholder="k7mz2qpx4r"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          returnKeyType="go"
          onSubmitEditing={submit}
          error={error}
        />
      </FormScreen>
    </>
  );
}
