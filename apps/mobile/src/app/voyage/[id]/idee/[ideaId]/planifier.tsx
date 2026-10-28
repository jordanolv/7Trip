import {
  createEventRequestSchema,
  eventCategoryForIdea,
  formatDayMonth,
  localIsoDate,
  planningDays,
  scheduleError,
  weekdayShort,
  type Idea,
} from '@7trip/shared';
import { colors, fontFamily, spacing } from '@7trip/ui-tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { Icon } from '@/components/ui/icon';
import { TimeField } from '@/components/ui/time-field';
import { useCreateEvent } from '@/events/events-api';
import { useOverlapWarning } from '@/events/use-overlap-warning';
import { CategoryTile } from '@/ideas/idea-visuals';
import { useIdea } from '@/ideas/ideas-api';
import { haptics } from '@/lib/haptics';
import { useAction } from '@/lib/use-action';
import { useTrip } from '@/trips/trips-api';
import { useTripId } from '@/trips/use-trip-id';

export default function PlanifierIdeeScreen() {
  const tripId = useTripId();
  const { ideaId } = useLocalSearchParams<{ ideaId: string }>();
  const idea = useIdea(tripId, ideaId);
  if (!idea.data) {
    return (
      <Sheet title="Ajouter au planning">
        <AppText tone="secondary">{idea.isPending ? 'Chargement…' : idea.error?.message}</AppText>
      </Sheet>
    );
  }
  return <Planifier tripId={tripId} idea={idea.data} />;
}

/**
 * An idea goes on the planning with a day and, if wanted, times (CDC §5). The event takes its
 * details and keeps the link: removing it from the planning puts the idea back, untouched.
 */
function Planifier({ tripId, idea }: { tripId: string; idea: Idea }) {
  const trip = useTrip(tripId);
  const create = useCreateEvent(tripId);
  // Only the trip's own days: an event stays within the trip.
  const days = planningDays({ startDate: trip.data?.startDate ?? null, endDate: trip.data?.endDate ?? null }, []);
  const today = localIsoDate();
  const [picked, setDay] = useState<string | null>(null);
  // Today during the trip, otherwise its first day (the trip may still be loading).
  const day = picked ?? (days.includes(today) ? today : (days[0] ?? today));
  const [timed, setTimed] = useState(false);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const schedule = { startDate: day, endDate: null, startTime: timed ? startTime : null, endTime: timed ? endTime : null };
  const error = scheduleError(schedule);
  const warning = useOverlapWarning(tripId, { ...schedule, participantIds: [] });

  const submit = useAction(async () => {
    const parsed = createEventRequestSchema.parse({
      title: idea.title,
      category: eventCategoryForIdea(idea.category),
      place: idea.place,
      url: idea.url,
      description: idea.description,
      ideaId: idea.id,
      ...schedule,
    });
    await create.mutateAsync(parsed);
    haptics.success();
    router.back();
  });

  return (
    <Sheet title="Ajouter au planning">
      <View style={styles.idea}>
        <CategoryTile category={idea.category} size={52} />
        <AppText variant="bodyStrong" style={styles.flex} numberOfLines={2}>
          {idea.title}
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="bodyStrong">Quel jour ?</AppText>
        {trip.data?.startDate ? (
          <View style={styles.days}>
            {days.map((d) => {
              const active = d === day;
              return (
                <Pressable
                  key={d}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={`${weekdayShort(d)} ${formatDayMonth(d)}`}
                  onPress={() => setDay(d)}
                  style={[styles.day, active && styles.dayActive]}
                >
                  <Text style={[styles.dayName, active && styles.dayTextActive]}>{weekdayShort(d)}</Text>
                  <Text style={[styles.dayNum, active && styles.dayTextActive]}>{Number(d.slice(8, 10))}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          // No trip dates yet: any day.
          <View style={styles.dateCard}>
            <DateField label="Jour" value={day} clearable={false} onChange={(d) => d && setDay(d)} />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <AppText variant="bodyStrong">
          Horaire <Text style={styles.optional}>· facultatif</Text>
        </AppText>
        <View style={styles.choices}>
          <Choice label="Sans horaire" active={!timed} onPress={() => setTimed(false)} />
          <Choice
            label={timed && startTime ? (endTime ? `${startTime} – ${endTime}` : startTime) : 'Préciser'}
            active={timed}
            onPress={() => {
              setTimed(true);
              setStartTime((t) => t ?? '10:00');
            }}
          />
        </View>
        {timed ? (
          <View style={styles.times}>
            <TimeField label="Début" value={startTime} fallback="10:00" onChange={setStartTime} />
            <TimeField label="Fin · facultatif" value={endTime} fallback={startTime ?? '10:00'} onChange={setEndTime} />
          </View>
        ) : null}
        {error ? (
          <AppText variant="caption" tone="danger">
            {error.message}
          </AppText>
        ) : null}
      </View>

      {warning ? (
        <View style={styles.warning} accessibilityRole="alert">
          <Icon name="alert" color={colors.warningInk} size={18} />
          <Text style={styles.warningText}>{warning}</Text>
        </View>
      ) : null}

      <View style={styles.note}>
        <Icon name="idea" color={colors.inkSecondary} size={18} />
        <AppText variant="caption" tone="secondary" style={styles.flex}>
          L’idée garde sa fiche, ses infos et son auteur. Si tu la retires du planning, elle revient simplement dans la boîte à idées.
        </AppText>
      </View>

      {submit.error ? (
        <AppText variant="caption" tone="danger">
          {submit.error}
        </AppText>
      ) : null}
      <Button
        title={`Ajouter au ${weekdayShort(day)}. ${formatDayMonth(day)}`}
        loading={submit.loading}
        disabled={error !== null}
        onPress={() => void submit.run()}
      />
    </Sheet>
  );
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={[styles.choice, active && styles.choiceActive]}
    >
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  idea: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  section: { gap: 10 },
  optional: { fontFamily: fontFamily.medium, color: colors.inkSecondary },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  day: {
    width: '22.5%',
    height: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E3DCCF',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  dayName: { fontFamily: fontFamily.semibold, fontSize: 11, textTransform: 'uppercase', color: colors.ink },
  dayNum: { fontFamily: fontFamily.extrabold, fontSize: 18, color: colors.ink },
  dayTextActive: { color: colors.surface },
  dateCard: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 14 },
  choices: { flexDirection: 'row', gap: spacing.sm },
  choice: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  choiceActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  choiceText: { fontFamily: fontFamily.semibold, fontSize: 14, color: colors.ink },
  choiceTextActive: { color: colors.surface },
  times: { flexDirection: 'row', gap: 10 },
  warning: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.warningTint, borderRadius: 14, padding: spacing.md },
  warningText: { flex: 1, fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 19, color: '#6E2F0C' },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
});
