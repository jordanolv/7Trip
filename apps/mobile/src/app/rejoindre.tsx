import { parseInvitationCode } from '@7trip/shared';
import { router } from 'expo-router';
import { useState } from 'react';

import { Sheet } from '@/components/sheet';
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
    <Sheet title="Rejoindre un voyage">
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
      <Button title="Continuer" onPress={submit} />
    </Sheet>
  );
}
