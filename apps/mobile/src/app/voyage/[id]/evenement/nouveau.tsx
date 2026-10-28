import { createEventRequestSchema, localIsoDate } from '@7trip/shared';
import { colors, fontFamily, spacing } from '@7trip/ui-tokens';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { EventForm, emptyEventForm, eventDraft, eventRequest, type EventFormValues } from '@/events/event-form';
import { useCreateEvent } from '@/events/events-api';
import { tripPeople } from '@/events/trip-people';
import { useOverlapWarning } from '@/events/use-overlap-warning';
import { useIdeas } from '@/ideas/ideas-api';
import { haptics } from '@/lib/haptics';
import { useAction } from '@/lib/use-action';
import { useTrip } from '@/trips/trips-api';
import { useTripId } from '@/trips/use-trip-id';

/** New event, on the day picked in the planning (`jour`), else the first day of the trip. */
export default function NouvelEvenementScreen() {
  const tripId = useTripId();
  const { jour } = useLocalSearchParams<{ jour?: string }>();
  const trip = useTrip(tripId);
  const create = useCreateEvent(tripId);
  const unplanned = (useIdeas(tripId).data ?? []).filter((idea) => !idea.plannedEvent);
  const [values, setValues] = useState<EventFormValues>(() => emptyEventForm(jour ?? trip.data?.startDate ?? localIsoDate()));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const warning = useOverlapWarning(tripId, eventDraft(values));

  const submit = useAction(async () => {
    const parsed = createEventRequestSchema.safeParse(eventRequest(values));
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
      <ScreenHeader mode="close" title="Nouvel événement" />
      <FormScreen footer={<Button title="Ajouter au planning" loading={submit.loading} onPress={() => void submit.run()} />}>
        {unplanned.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(`/voyage/${tripId}/evenement/depuis-idee` as Href)}
            style={({ pressed }) => [styles.fromIdea, pressed && styles.pressed]}
          >
            <Icon name="idea" color={colors.infoInk} size={20} />
            <Text style={styles.fromIdeaText}>Partir d’une idée de la boîte à idées</Text>
            <Icon name="chevronRight" color={colors.infoInk} size={18} />
          </Pressable>
        ) : null}
        <EventForm
          values={values}
          onChange={setValues}
          errors={{ ...submit.fieldErrors, ...errors }}
          people={tripPeople(trip.data)}
          warning={warning}
          autoFocusTitle
        />
        {submit.error ? (
          <AppText variant="caption" tone="danger">
            {submit.error}
          </AppText>
        ) : null}
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  fromIdea: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.infoTint, borderRadius: 16, padding: 14 },
  fromIdeaText: { flex: 1, fontFamily: fontFamily.semibold, fontSize: 14, color: colors.infoInk },
  pressed: { opacity: 0.7 },
});
