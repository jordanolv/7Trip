import { localIsoDate, parseInvitationCode, type InvitationPreview } from '@7trip/shared';
import { colors, spacing } from '@7trip/ui-tokens';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ApiError } from '@/lib/api';
import { setPendingInvitation } from '@/lib/invitation-link';
import { useAction } from '@/lib/use-action';
import { TripPreviewCard } from '@/trips/trip-preview-card';
import { useInvitationPreview, useJoinTrip } from '@/trips/trips-api';

/** Opened from an invitation link (…/j/<code>) or from "Rejoindre un voyage". */
export default function InvitationScreen() {
  const params = useLocalSearchParams<{ code: string }>();
  const code = parseInvitationCode(params.code ?? '');
  const { status } = useAuth();

  return (
    <>
      <ScreenHeader mode="close" title="Invitation" />
      {!code ? <Invalid /> : status !== 'signedIn' ? <SignedOut code={code} /> : <Preview code={code} />}
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
  const join = useJoinTrip(preview.code);
  const open = () => router.replace(`/voyage/${preview.tripId}` as Href);
  const run = useAction(async () => {
    await join.mutateAsync();
    open();
  });
  const organizers = preview.organizers.join(', ');

  return (
    <FormScreen
      footer={
        preview.alreadyMember ? (
          <Button title="Ouvrir le voyage" onPress={open} />
        ) : (
          <Button title="Rejoindre le voyage" loading={run.loading} onPress={() => void run.run()} />
        )
      }
    >
      <AppText variant="title">{preview.alreadyMember ? 'Tu fais déjà partie de ce voyage' : `${organizers} t’invite à rejoindre ce voyage`}</AppText>
      <TripPreviewCard trip={preview} color={preview.color} icon={preview.icon} today={localIsoDate()} />
      {preview.alreadyMember ? null : (
        <AppText tone="secondary">Tu le rejoindras comme participant : tu pourras voir le planning, proposer des idées, voter et ajouter des dépenses.</AppText>
      )}
      {run.error ? (
        <AppText variant="caption" tone="danger">
          {run.error}
        </AppText>
      ) : null}
    </FormScreen>
  );
}

function SignedOut({ code }: { code: string }) {
  const signIn = () => {
    // Brought back here by "Mes voyages" once signed in.
    setPendingInvitation(code);
    router.push('/auth');
  };
  return (
    <FormScreen footer={<Button title="Me connecter pour rejoindre" onPress={signIn} />}>
      <View style={styles.badge}>
        <Icon name="users" color={colors.accentInk} size={28} />
      </View>
      <AppText variant="title">On t’invite à un voyage</AppText>
      <AppText tone="secondary">
        Connecte-toi ou crée ton compte pour voir le voyage et le rejoindre. Rejoindre sans compte arrive bientôt.
      </AppText>
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
  badge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});
