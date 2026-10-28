import { createIdeaRequestSchema } from '@7trip/shared';
import { router } from 'expo-router';
import { useState } from 'react';

import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { IdeaForm, emptyIdeaForm, type IdeaFormValues } from '@/ideas/idea-form';
import { useCreateIdea } from '@/ideas/ideas-api';
import { haptics } from '@/lib/haptics';
import { useAction } from '@/lib/use-action';
import { useTripId } from '@/trips/use-trip-id';

export default function NouvelleIdeeScreen() {
  const tripId = useTripId();
  const create = useCreateIdea(tripId);
  const [values, setValues] = useState<IdeaFormValues>(emptyIdeaForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = useAction(async () => {
    const parsed = createIdeaRequestSchema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    await create.mutateAsync(parsed.data);
    haptics.success();
    router.back();
  });

  return (
    <>
      <ScreenHeader mode="close" title="Nouvelle idée" />
      <FormScreen footer={<Button title="Proposer l’idée" loading={submit.loading} onPress={() => void submit.run()} />}>
        <IdeaForm values={values} onChange={setValues} errors={{ ...submit.fieldErrors, ...errors }} autoFocusTitle />
        {submit.error ? (
          <AppText variant="caption" tone="danger">
            {submit.error}
          </AppText>
        ) : null}
      </FormScreen>
    </>
  );
}
