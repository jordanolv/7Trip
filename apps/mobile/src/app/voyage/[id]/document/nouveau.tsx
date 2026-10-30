import type { TripEvent } from '@7trip/shared';
import { colors, spacing } from '@7trip/ui-tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { DocumentForm, documentFields, documentFormErrors, newDocumentForm, type DocumentFormValues } from '@/documents/document-form';
import { useAddDocument } from '@/documents/documents-api';
import { useEvent } from '@/events/events-api';
import { haptics } from '@/lib/haptics';
import { useAction } from '@/lib/use-action';
import { useTripId } from '@/trips/use-trip-id';

/** `?evenement=<id>`: added from a planning item, already linked to it. */
export default function NouveauDocumentScreen() {
  const tripId = useTripId();
  const { evenement } = useLocalSearchParams<{ evenement?: string }>();
  return (
    <>
      <ScreenHeader mode="close" title="Nouveau document" />
      {evenement ? <FromEvent tripId={tripId} eventId={evenement} /> : <NouveauDocument tripId={tripId} event={null} />}
    </>
  );
}

function FromEvent({ tripId, eventId }: { tripId: string; eventId: string }) {
  const event = useEvent(tripId, eventId);
  // Deleted meanwhile: a plain new document.
  if (event.isPending) return <ActivityIndicator color={colors.accent} style={styles.loading} />;
  return <NouveauDocument tripId={tripId} event={event.data ?? null} />;
}

function NouveauDocument({ tripId, event }: { tripId: string; event: TripEvent | null }) {
  const add = useAddDocument(tripId);
  const [values, setValues] = useState<DocumentFormValues>(() => newDocumentForm(event));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = useAction(async () => {
    const found = documentFormErrors(values, true);
    setErrors(found);
    if (Object.keys(found).length) return;
    const fields = documentFields(values);
    await add.mutateAsync(values.kind === 'LINK' ? { link: { ...fields, url: values.url } } : { file: values.file!, meta: fields });
    haptics.success();
    router.back();
  });

  return (
    <FormScreen
      footer={<Button title={values.kind === 'LINK' ? 'Ajouter le lien' : 'Envoyer le document'} loading={submit.loading} onPress={() => void submit.run()} />}
    >
      <DocumentForm tripId={tripId} values={values} onChange={setValues} errors={{ ...submit.fieldErrors, ...errors }} adding />
      {submit.error ? (
        <AppText variant="caption" tone="danger">
          {submit.error}
        </AppText>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({ loading: { marginTop: spacing.xxl } });
