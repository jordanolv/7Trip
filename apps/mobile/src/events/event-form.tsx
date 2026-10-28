import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_LABELS,
  addDays,
  authorName,
  type ContentAuthor,
  type CreateEventRequest,
  type EventCategory,
  type TripEvent,
} from '@7trip/shared';
import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { DateField } from '@/components/ui/date-field';
import { Icon } from '@/components/ui/icon';
import { TextField } from '@/components/ui/text-field';
import { TimeField } from '@/components/ui/time-field';

import { EventIcon } from './event-visuals';

export interface EventFormValues {
  title: string;
  category: EventCategory;
  startDate: string;
  /** "Plusieurs jours ?" */
  multiDay: boolean;
  endDate: string | null;
  /** "Horaires" switch. */
  timed: boolean;
  startTime: string | null;
  endTime: string | null;
  place: string;
  url: string;
  bookingRef: string;
  description: string;
  /** Empty: the whole group. */
  participantIds: string[];
}

export const emptyEventForm = (startDate: string): EventFormValues => ({
  title: '',
  category: 'ACTIVITY',
  startDate,
  multiDay: false,
  endDate: null,
  timed: false,
  startTime: null,
  endTime: null,
  place: '',
  url: '',
  bookingRef: '',
  description: '',
  participantIds: [],
});

export const eventFormValues = (event: TripEvent): EventFormValues => ({
  title: event.title,
  category: event.category,
  startDate: event.startDate,
  multiDay: event.endDate !== null,
  endDate: event.endDate,
  timed: event.startTime !== null,
  startTime: event.startTime,
  endTime: event.endTime,
  place: event.place ?? '',
  url: event.url ?? '',
  bookingRef: event.bookingRef ?? '',
  description: event.description ?? '',
  participantIds: event.participantIds,
});

/** What the form sends: switched-off parts are cleared, not kept hidden. */
export function eventRequest(values: EventFormValues): Omit<CreateEventRequest, 'ideaId'> {
  return {
    title: values.title,
    category: values.category,
    startDate: values.startDate,
    endDate: values.multiDay ? values.endDate : null,
    startTime: values.timed ? values.startTime : null,
    endTime: values.timed ? values.endTime : null,
    place: values.place,
    url: values.url,
    bookingRef: values.bookingRef,
    description: values.description,
    participantIds: values.participantIds,
  };
}

/** When the event takes place and who is on it, for the overlap check. */
export const eventDraft = (values: EventFormValues) => ({
  startDate: values.startDate,
  endDate: values.multiDay ? values.endDate : null,
  startTime: values.timed ? values.startTime : null,
  endTime: values.timed ? values.endTime : null,
  participantIds: values.participantIds,
});

/** Title, category and when first; then where, who and the booking (CDC §7). */
export function EventForm({
  values,
  onChange,
  errors,
  people,
  warning,
  autoFocusTitle,
}: {
  values: EventFormValues;
  onChange: (values: EventFormValues) => void;
  errors: Record<string, string | undefined>;
  /** Who can be put on the event: the trip's members, plus anyone already on it who left. */
  people: ContentAuthor[];
  /** Overlap notice: shown, never blocking. */
  warning: string | null;
  autoFocusTitle?: boolean;
}) {
  const set = (patch: Partial<EventFormValues>) => onChange({ ...values, ...patch });
  const toggle = (id: string) => {
    const ids = values.participantIds.includes(id) ? values.participantIds.filter((p) => p !== id) : [...values.participantIds, id];
    set({ participantIds: ids });
  };

  return (
    <>
      <TextField
        label="Titre"
        value={values.title}
        onChangeText={(title) => set({ title })}
        placeholder="Tapas à Triana"
        autoFocus={autoFocusTitle}
        maxLength={80}
        error={errors.title}
      />

      <View style={styles.section}>
        <AppText variant="label">Catégorie</AppText>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {EVENT_CATEGORIES.map((category) => {
            const active = values.category === category;
            return (
              <Pressable
                key={category}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => set({ category })}
                style={[styles.chip, active && styles.chipActive]}
              >
                <EventIcon category={category} size={16} color={active ? colors.surface : undefined} />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{EVENT_CATEGORY_LABELS[category]}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Icon name="calendar" color={colors.accentInk} size={20} />
          <View style={styles.flex}>
            <DateField
              label={values.multiDay ? 'Du' : 'Jour'}
              value={values.startDate}
              clearable={false}
              onChange={(startDate) => startDate && set({ startDate })}
            />
          </View>
        </View>
        {values.multiDay ? (
          <View style={[styles.cardRow, styles.indented]}>
            <View style={styles.flex}>
              <DateField
                label="Au"
                value={values.endDate}
                minimumDate={values.startDate}
                clearable={false}
                onChange={(endDate) => set({ endDate })}
              />
            </View>
          </View>
        ) : null}
        {errors.endDate ? <FieldError message={errors.endDate} /> : null}
        <SwitchRow
          label="Plusieurs jours"
          value={values.multiDay}
          onChange={(multiDay) => set({ multiDay, endDate: multiDay ? (values.endDate ?? addDays(values.startDate, 1)) : null })}
        />

        <View style={styles.separator} />
        <View style={styles.cardRow}>
          <Icon name="clock" color={colors.accentInk} size={20} />
          <AppText variant="bodyStrong" style={styles.flex}>
            Horaires
          </AppText>
          <Switch
            accessibilityLabel="Préciser des horaires"
            value={values.timed}
            onValueChange={(timed) => set({ timed, startTime: timed ? (values.startTime ?? '10:00') : values.startTime })}
            trackColor={{ true: colors.accent, false: colors.border }}
          />
        </View>
        {values.timed ? (
          <View style={[styles.times, styles.indented]}>
            <TimeField label="Début" value={values.startTime} fallback="10:00" onChange={(startTime) => set({ startTime })} />
            <TimeField
              label="Fin · facultatif"
              value={values.endTime}
              fallback={values.startTime ?? '10:00'}
              onChange={(endTime) => set({ endTime })}
            />
          </View>
        ) : null}
        {values.timed && values.endTime ? (
          <Pressable accessibilityRole="button" onPress={() => set({ endTime: null })} style={[styles.indented, styles.clearEnd]}>
            <AppText variant="caption" tone="accent">
              Sans heure de fin
            </AppText>
          </Pressable>
        ) : null}
        {errors.endTime ? <FieldError message={errors.endTime} /> : null}
      </View>

      <View style={styles.section}>
        <AppText variant="label">Qui y va ?</AppText>
        <View style={styles.chips}>
          <PersonChip label="Tout le groupe" active={values.participantIds.length === 0} onPress={() => set({ participantIds: [] })} />
          {people.map((person) => (
            <PersonChip
              key={person.id}
              label={authorName(person)}
              active={values.participantIds.includes(person.id)}
              onPress={() => toggle(person.id)}
            />
          ))}
        </View>
      </View>

      {warning ? (
        <View style={styles.warning} accessibilityRole="alert">
          <Icon name="alert" color={colors.warningInk} size={18} />
          <Text style={styles.warningText}>{warning}</Text>
        </View>
      ) : null}

      <TextField label="Lieu" value={values.place} onChangeText={(place) => set({ place })} placeholder="Calle Eslava 3, Séville" maxLength={120} error={errors.place} />
      <TextField
        label="Lien"
        value={values.url}
        onChangeText={(url) => set({ url })}
        placeholder="Réservation, Google Maps…"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={500}
        error={errors.url}
      />
      <TextField
        label="Référence de réservation"
        value={values.bookingRef}
        onChangeText={(bookingRef) => set({ bookingRef })}
        placeholder="ALC-48213"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={60}
        error={errors.bookingRef}
      />
      <TextField
        label="Description"
        value={values.description}
        onChangeText={(description) => set({ description })}
        placeholder="À savoir, à emporter…"
        multiline
        maxLength={1000}
        style={styles.multiline}
        error={errors.description}
      />
    </>
  );
}

function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={[styles.cardRow, styles.indented, styles.switchRow]}>
      <AppText tone="secondary" style={styles.flex}>
        {label}
      </AppText>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.border }} />
    </View>
  );
}

function PersonChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      {active ? <Icon name="check" color={colors.surface} size={14} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <AppText variant="caption" tone="danger" style={styles.indented}>
      {message}
    </AppText>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: radii.chip,
    backgroundColor: colors.chip,
  },
  chipActive: { backgroundColor: colors.ink },
  chipText: { fontFamily: fontFamily.semibold, fontSize: 14, color: colors.inkTertiary },
  chipTextActive: { color: colors.surface },
  card: { backgroundColor: colors.surface, borderRadius: 20, paddingVertical: spacing.xs, paddingHorizontal: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  switchRow: { minHeight: 44 },
  indented: { marginLeft: 32 },
  separator: { height: 1, backgroundColor: colors.separator, marginLeft: 32 },
  times: { flexDirection: 'row', gap: 10, paddingBottom: spacing.sm },
  clearEnd: { minHeight: 32, justifyContent: 'center', paddingBottom: spacing.sm },
  warning: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.warningTint, borderRadius: 14, padding: spacing.md },
  warningText: { flex: 1, fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 19, color: '#6E2F0C' },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
});
