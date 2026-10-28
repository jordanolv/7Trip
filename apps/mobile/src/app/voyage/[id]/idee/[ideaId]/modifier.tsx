import { ApiErrorCode, updateIdeaRequestSchema, type Idea } from '@7trip/shared';
import { colors, spacing } from '@7trip/ui-tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { IdeaForm, ideaFormValues, type IdeaFormValues } from '@/ideas/idea-form';
import { useDeleteIdea, useIdea, useUpdateIdea } from '@/ideas/ideas-api';
import { ApiError, errorMessage } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { useAction } from '@/lib/use-action';
import { useTripId } from '@/trips/use-trip-id';

export default function ModifierIdeeScreen() {
  const tripId = useTripId();
  const { ideaId } = useLocalSearchParams<{ ideaId: string }>();
  const idea = useIdea(tripId, ideaId);

  if (!idea.data) {
    return (
      <>
        <ScreenHeader mode="close" title="Modifier l’idée" />
        <View style={styles.center}>
          {idea.isPending ? <ActivityIndicator color={colors.accent} /> : <AppText tone="secondary">{idea.error?.message}</AppText>}
        </View>
      </>
    );
  }
  return <ModifierIdee tripId={tripId} idea={idea.data} />;
}

function ModifierIdee({ tripId, idea }: { tripId: string; idea: Idea }) {
  const update = useUpdateIdea(tripId, idea.id);
  const remove = useDeleteIdea(tripId, idea.id);
  // The form keeps what was loaded when it opened: that is the version the changes are made on.
  const [values, setValues] = useState<IdeaFormValues>(() => ideaFormValues(idea));
  const [version] = useState(idea.version);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useAction(async () => {
    const parsed = updateIdeaRequestSchema.safeParse({ ...values, version });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    try {
      await update.mutateAsync(parsed.data);
    } catch (error) {
      if (!(error instanceof ApiError && error.code === ApiErrorCode.EditConflict)) throw error;
      // The idea refreshes behind this screen: going back shows the other person's changes.
      Alert.alert('Idée modifiée entre-temps', error.message, [{ text: 'Voir l’idée', onPress: () => router.back() }]);
      return;
    }
    router.back();
  });

  const confirmDelete = () => {
    haptics.warning();
    Alert.alert(`Supprimer « ${idea.title} » ?`, 'L’idée disparaîtra pour tout le groupe.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          remove.mutate(undefined, {
            // Back past the idea itself, to the list.
            onSuccess: () => router.dismiss(2),
            onError: (error) => Alert.alert('Suppression impossible', errorMessage(error)),
          });
        },
      },
    ]);
  };

  if (!idea.canEdit) {
    return (
      <>
        <ScreenHeader mode="close" title="Modifier l’idée" />
        <FormScreen>
          <AppText tone="secondary">Seuls son auteur et les organisateurs peuvent modifier cette idée.</AppText>
        </FormScreen>
      </>
    );
  }

  return (
    <>
      <ScreenHeader mode="close" title="Modifier l’idée" />
      <FormScreen footer={<Button title="Enregistrer" loading={save.loading} onPress={() => void save.run()} />}>
        <IdeaForm values={values} onChange={setValues} errors={{ ...save.fieldErrors, ...errors }} />

        <Pressable accessibilityRole="button" onPress={confirmDelete} disabled={remove.isPending} style={styles.delete}>
          <Icon name="trash" color={colors.danger} size={20} />
          <AppText variant="bodyStrong" style={{ color: colors.danger }}>
            Supprimer l’idée
          </AppText>
        </Pressable>

        {save.error ? (
          <AppText variant="caption" tone="danger">
            {save.error}
          </AppText>
        ) : null}
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.dangerTint,
  },
});
