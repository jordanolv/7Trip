import { ApiErrorCode, EVENT_CONFLICT_GROUPS, chooseVersion, mergeEdits, updateEventRequestSchema, type MergeResult, type TripEvent } from '@7trip/shared';
import { colors, spacing } from '@7trip/ui-tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useAuth } from '@/auth/auth-context';
import { EventConflict, type ConflictGroup, type EventFields } from '@/events/event-conflict';
import { EventForm, eventDraft, eventFormValues, eventRequest, type EventFormValues } from '@/events/event-form';
import { useDeleteEvent, useEvent, useUpdateEvent } from '@/events/events-api';
import { tripPeople } from '@/events/trip-people';
import { useOverlapWarning } from '@/events/use-overlap-warning';
import { ApiError, errorMessage } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { useAction } from '@/lib/use-action';
import { useTrip } from '@/trips/trips-api';
import { useTripId } from '@/trips/use-trip-id';

interface Conflict extends Omit<MergeResult<EventFields>, 'conflicts' | 'keptMine'> {
  latest: TripEvent;
  theirs: EventFields;
  mine: EventFields;
  conflicts: ConflictGroup[];
  keptMine: ConflictGroup[];
  choices: Partial<Record<ConflictGroup, 'mine' | 'theirs'>>;
}

export default function ModifierEvenementScreen() {
  const tripId = useTripId();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const event = useEvent(tripId, eventId);

  if (!event.data) {
    return (
      <>
        <ScreenHeader mode="close" title="Modifier l’événement" />
        <View style={styles.center}>
          {event.isPending ? <ActivityIndicator color={colors.accent} /> : <AppText tone="secondary">{event.error?.message}</AppText>}
        </View>
      </>
    );
  }
  return <ModifierEvenement tripId={tripId} event={event.data} />;
}

function ModifierEvenement({ tripId, event }: { tripId: string; event: TripEvent }) {
  const trip = useTrip(tripId);
  const update = useUpdateEvent(tripId, event.id);
  const remove = useDeleteEvent(tripId, event.id);
  // The form keeps what was loaded when it opened: that is the version the changes are made on.
  const [values, setValues] = useState<EventFormValues>(() => eventFormValues(event));
  const [version] = useState(event.version);
  const [original] = useState(() => eventRequest(eventFormValues(event)));
  const { tripRequest } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const warning = useOverlapWarning(tripId, eventDraft(values), event.id);

  // Someone saved meanwhile: the merge to confirm, against their version (mockup G-Conflit).
  const [conflict, setConflict] = useState<Conflict | null>(null);

  /** Saves on `base` (the version it was made on). A newer one: merged, or the choices to make. */
  const submit = async (fields: EventFields, base: { fields: EventFields; version: number }) => {
    const parsed = updateEventRequestSchema.safeParse({ ...fields, version: base.version });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      setConflict(null);
      return;
    }
    setErrors({});
    try {
      await update.mutateAsync(parsed.data);
    } catch (error) {
      if (!(error instanceof ApiError && error.code === ApiErrorCode.EditConflict)) throw error;
      const latest = await tripRequest<TripEvent>(tripId, `/trips/${tripId}/events/${event.id}`);
      const theirs = eventRequest(eventFormValues(latest));
      const result = mergeEdits(base.fields, fields, theirs, EVENT_CONFLICT_GROUPS);
      const next = { latest, theirs, mine: fields, ...result, conflicts: result.conflicts as ConflictGroup[], keptMine: result.keptMine as ConflictGroup[], choices: {} };
      // Nothing collides: both sets of changes go together, without asking.
      if (!next.conflicts.length) return submit(result.merged, { fields: theirs, version: latest.version });
      setConflict(next);
      return;
    }
    haptics.success();
    router.back();
  };

  const save = useAction(async () => {
    if (!conflict) return submit(eventRequest(values), { fields: original, version });
    let merged = conflict.merged;
    for (const group of conflict.conflicts) if (conflict.choices[group] === 'mine') merged = chooseVersion(merged, conflict.mine, EVENT_CONFLICT_GROUPS[group]);
    return submit(merged, { fields: conflict.theirs, version: conflict.latest.version });
  });
  const unresolved = conflict ? conflict.conflicts.some((group) => !conflict.choices[group]) : false;

  const confirmDelete = () => {
    haptics.warning();
    Alert.alert(
      event.idea ? 'Retirer du planning ?' : `Supprimer « ${event.title} » ?`,
      event.idea ? 'L’idée reste dans la boîte à idées, avec sa fiche.' : 'L’événement disparaîtra du planning pour tout le groupe.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: event.idea ? 'Retirer' : 'Supprimer',
          style: 'destructive',
          onPress: () =>
            remove.mutate(undefined, {
              // Back past the event itself, to the planning.
              onSuccess: () => router.dismiss(2),
              onError: (error) => Alert.alert('Suppression impossible', errorMessage(error)),
            }),
        },
      ],
    );
  };

  if (!event.canEdit) {
    return (
      <>
        <ScreenHeader mode="close" title="Modifier l’événement" />
        <FormScreen>
          <AppText tone="secondary">Seuls son auteur, les personnes qui y vont et les organisateurs peuvent modifier cet événement.</AppText>
        </FormScreen>
      </>
    );
  }

  if (conflict) {
    return (
      <>
        <ScreenHeader mode="close" title={event.title} />
        <FormScreen
          footer={<Button title={unresolved ? 'Choisis une version' : 'Enregistrer'} disabled={unresolved} loading={save.loading} onPress={() => void save.run()} />}
        >
          <EventConflict
            conflicts={conflict.conflicts}
            keptMine={conflict.keptMine}
            mine={conflict.mine}
            theirs={conflict.theirs}
            choices={conflict.choices}
            onChoose={(group, side) => setConflict({ ...conflict, choices: { ...conflict.choices, [group]: side } })}
            people={tripPeople(trip.data, conflict.latest)}
          />
          {save.error ? (
            <AppText variant="caption" tone="danger">
              {save.error}
            </AppText>
          ) : null}
        </FormScreen>
      </>
    );
  }

  return (
    <>
      <ScreenHeader mode="close" title="Modifier l’événement" />
      <FormScreen footer={<Button title="Enregistrer" loading={save.loading} onPress={() => void save.run()} />}>
        <EventForm
          values={values}
          onChange={setValues}
          errors={{ ...save.fieldErrors, ...errors }}
          people={tripPeople(trip.data, event)}
          warning={warning}
          tripDates={{ startDate: trip.data?.startDate ?? null, endDate: trip.data?.endDate ?? null }}
        />

        <Pressable accessibilityRole="button" onPress={confirmDelete} disabled={remove.isPending} style={styles.delete}>
          <Icon name={event.idea ? 'undo' : 'trash'} color={colors.danger} size={20} />
          <AppText variant="bodyStrong" style={{ color: colors.danger }}>
            {event.idea ? 'Retirer du planning' : 'Supprimer l’événement'}
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
