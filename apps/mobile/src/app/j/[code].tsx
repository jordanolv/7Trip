import { localIsoDate, parseInvitationCode, type InvitationPreview } from '@7trip/shared';
import { colors, spacing } from '@7trip/ui-tokens';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { ApiError } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { setPendingInvitation } from '@/lib/invitation-link';
import { useAction } from '@/lib/use-action';
import { TripPreviewCard } from '@/trips/trip-preview-card';
import { useInvitationPreview, useJoinAsGuest, useJoinTrip } from '@/trips/trips-api';

/** Opened from an invitation link (…/j/<code>) or from "Rejoindre un voyage". */
export default function InvitationScreen() {
  const params = useLocalSearchParams<{ code: string }>();
  const code = parseInvitationCode(params.code ?? '');
  const { status } = useAuth();

  return (
    <>
      <ScreenHeader mode="close" title="Invitation" />
      {!code ? <Invalid /> : status === 'loading' ? null : <Preview code={code} />}
    </>
  );
}

function Preview({ code }: { code: string }) {
  const preview = useInvitationPreview(code);
  if (preview.data) return <Join preview={preview.data} />;
  if (preview.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (preview.error instanceof ApiError && preview.error.status === 404) return <Invalid />;
  return (
    <FormScreen footer={<Button title="Réessayer" onPress={() => void preview.refetch()} />}>
      <AppText tone="secondary">{preview.error?.message}</AppText>
    </FormScreen>
  );
}

function Join({ preview }: { preview: InvitationPreview }) {
  const { status, guestSessions } = useAuth();
  const signedIn = status === 'signedIn';
  const join = useJoinTrip(preview.code);
  const joinAsGuest = useJoinAsGuest(preview.code);
  const [name, setName] = useState('');
  const open = () => router.replace(`/voyage/${preview.tripId}` as Href);
  const run = useAction(async () => {
    if (signedIn) await join.mutateAsync();
    else await joinAsGuest.mutateAsync(name);
    haptics.success();
    open();
  });
  const signIn = () => {
    // Brought back here by "Mes voyages" once signed in.
    setPendingInvitation(preview.code);
    router.push('/auth');
  };
  const alreadyIn = signedIn ? preview.alreadyMember : preview.tripId in guestSessions;
  const organizers = preview.organizers.join(', ');

  return (
    <FormScreen
      footer={
        alreadyIn ? (
          <Button title="Ouvrir le voyage" onPress={open} />
        ) : signedIn ? (
          <Button title="Rejoindre le voyage" loading={run.loading} onPress={() => void run.run()} />
        ) : (
          <View style={styles.actions}>
            <Button title="Rejoindre sans compte" loading={run.loading} disabled={!name.trim()} onPress={() => void run.run()} />
            <Button title="J’ai un compte" variant="soft" onPress={signIn} />
          </View>
        )
      }
    >
      <AppText variant="title">{alreadyIn ? 'Tu fais déjà partie de ce voyage' : `${organizers} t’invite à rejoindre ce voyage`}</AppText>
      <TripPreviewCard trip={preview} color={preview.color} icon={preview.icon} today={localIsoDate()} />
      {alreadyIn ? null : signedIn ? (
        <AppText tone="secondary">Tu le rejoindras comme participant : tu pourras voir le planning, proposer des idées, voter et ajouter des dépenses.</AppText>
      ) : (
        <>
          <TextField
            label="Ton prénom ou pseudo"
            value={name}
            onChangeText={setName}
            placeholder="Comment les autres te verront"
            autoCapitalize="words"
            autoComplete="given-name"
            returnKeyType="go"
            onSubmitEditing={() => name.trim() && void run.run()}
          />
          <AppText variant="caption" tone="secondary">
            Pas besoin de compte pour voir le voyage et voter. Si tu en crées un plus tard, tu retrouveras tout ce que tu as fait.
          </AppText>
        </>
      )}
      {run.error ? (
        <AppText variant="caption" tone="danger">
          {run.error}
        </AppText>
      ) : null}
    </FormScreen>
  );
}

function Invalid() {
  return (
    <FormScreen footer={<Button title="Retour à mes voyages" variant="secondary" onPress={() => router.dismissTo('/')} />}>
      <AppText variant="title">Ce lien n’est plus valable</AppText>
      <AppText tone="secondary">L’organisateur a peut-être renouvelé le lien d’invitation. Demande-lui le nouveau.</AppText>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  actions: { gap: spacing.sm },
});
