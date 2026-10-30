import { EVENT_CATEGORY_LABELS, EVENT_CONFLICT_GROUPS, formatDayMonth, type ContentAuthor, type CreateEventRequest } from '@7trip/shared';
import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';

export type EventFields = Omit<CreateEventRequest, 'ideaId'>;
export type ConflictGroup = keyof typeof EVENT_CONFLICT_GROUPS;

/** A group of fields as the person reads it: "10:30 – 12:30", "Tout le groupe"… */
function show(group: ConflictGroup, fields: EventFields, people: ContentAuthor[]): string {
  switch (group) {
    case 'Catégorie':
      return EVENT_CATEGORY_LABELS[fields.category ?? 'ACTIVITY'];
    case 'Dates':
      return fields.endDate && fields.endDate !== fields.startDate
        ? `${formatDayMonth(fields.startDate)} – ${formatDayMonth(fields.endDate)}`
        : formatDayMonth(fields.startDate);
    case 'Horaire':
      return fields.startTime ? `${fields.startTime}${fields.endTime ? ` – ${fields.endTime}` : ''}` : 'Toute la journée';
    case 'Participants':
      return fields.participantIds?.length
        ? fields.participantIds.map((id) => people.find((p) => p.id === id)?.displayName ?? '?').join(', ')
        : 'Tout le groupe';
    default: {
      const value = fields[EVENT_CONFLICT_GROUPS[group][0] as keyof EventFields];
      return typeof value === 'string' && value.trim() ? value : '—';
    }
  }
}

/**
 * Someone saved the event while it was being edited (mockup G-Conflit). What only one side changed
 * is already kept; for each group both changed, the person saving picks a version.
 */
export function EventConflict({
  conflicts,
  keptMine,
  mine,
  theirs,
  choices,
  onChoose,
  people,
}: {
  conflicts: ConflictGroup[];
  keptMine: ConflictGroup[];
  mine: EventFields;
  theirs: EventFields;
  choices: Partial<Record<ConflictGroup, 'mine' | 'theirs'>>;
  onChoose: (group: ConflictGroup, side: 'mine' | 'theirs') => void;
  people: ContentAuthor[];
}) {
  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Icon name="alert" color="#8A3D12" size={22} />
        </View>
        <View style={styles.flex}>
          <AppText variant="heading">Modifié entre-temps</AppText>
          <AppText variant="caption" tone="secondary">
            Quelqu’un a enregistré cet événement pendant que tu l’éditais. Choisis quoi garder.
          </AppText>
        </View>
      </View>

      {conflicts.map((group) => (
        <View key={group} style={styles.card}>
          <AppText variant="label" tone="secondary">
            {group}
          </AppText>
          {(['theirs', 'mine'] as const).map((side) => {
            const active = choices[group] === side;
            return (
              <Pressable
                key={side}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => onChoose(group, side)}
                style={[styles.option, active && styles.optionActive]}
              >
                <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.dot} /> : null}</View>
                <View style={styles.flex}>
                  <Text style={styles.optionLabel}>{side === 'theirs' ? 'Leur version' : 'Ta version'}</Text>
                  <Text style={styles.optionValue}>{show(group, side === 'theirs' ? theirs : mine, people)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      {keptMine.map((group) => (
        <View key={group} style={styles.kept}>
          <Icon name="check" color={colors.accentInk} size={18} />
          <AppText variant="caption" style={styles.flex}>
            {group} · modifié par toi seul
          </AppText>
          <Text style={styles.keptText}>Conservé</Text>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FBEBDD', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: spacing.md, gap: spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.md, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border },
  optionActive: { borderColor: colors.accent, backgroundColor: colors.accentTint },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#C9C2B4', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.accent },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  optionLabel: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.inkSecondary },
  optionValue: { fontFamily: fontFamily.bold, fontSize: 15, color: colors.ink },
  kept: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.chip, backgroundColor: colors.accentTint },
  keptText: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.accentInk },
});
