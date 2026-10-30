import { ApiErrorCode, type TripDocument } from '@7trip/shared';
import { colors } from '@7trip/ui-tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { DocumentForm, documentFields, documentFormErrors, documentFormValues, type DocumentFormValues } from '@/documents/document-form';
import { useDocument, useUpdateDocument } from '@/documents/documents-api';
import { ApiError } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { useAction } from '@/lib/use-action';
import { useTripId } from '@/trips/use-trip-id';

export default function ModifierDocumentScreen() {
  const tripId = useTripId();
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const doc = useDocument(tripId, documentId);
  return (
    <>
      <ScreenHeader mode="close" title="Modifier le document" />
      {doc.data ? (
        <ModifierDocument tripId={tripId} doc={doc.data} />
      ) : (
        <View style={styles.center}>
          {doc.isPending ? <ActivityIndicator color={colors.accent} /> : <AppText tone="secondary">{doc.error?.message}</AppText>}
        </View>
      )}
    </>
  );
}

function ModifierDocument({ tripId, doc }: { tripId: string; doc: TripDocument }) {
  const update = useUpdateDocument(tripId, doc.id);
  // The form keeps what was loaded when it opened: that is the version the changes are made on.
  const [values, setValues] = useState<DocumentFormValues>(() => documentFormValues(doc));
  const [version] = useState(doc.version);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = useAction(async () => {
    const found = documentFormErrors(values, false);
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      await update.mutateAsync({
        ...documentFields(values),
        ...(doc.kind === 'LINK' && { url: values.url }),
        version,
      });
    } catch (error) {
      if (!(error instanceof ApiError && error.code === ApiErrorCode.EditConflict)) throw error;
      Alert.alert('Document modifié entre-temps', error.message, [{ text: 'Voir le document', onPress: () => router.back() }]);
      return;
    }
    haptics.success();
    router.back();
  });

  return (
    <FormScreen footer={<Button title="Enregistrer" loading={submit.loading} onPress={() => void submit.run()} />}>
      <DocumentForm tripId={tripId} values={values} onChange={setValues} errors={{ ...submit.fieldErrors, ...errors }} adding={false} />
      {submit.error ? (
        <AppText variant="caption" tone="danger">
          {submit.error}
        </AppText>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
