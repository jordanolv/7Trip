import {
  IDEA_POLL_KINDS,
  MAX_POLL_OPTIONS,
  POLL_KINDS,
  POLL_KIND_LABELS,
  YES_NO_OPTIONS,
  addDays,
  createPollRequestSchema,
  dateOptionLabel,
  localIsoDate,
  type PollKind,
} from '@7trip/shared';
import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import { router, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { Icon } from '@/components/ui/icon';
import { TextField } from '@/components/ui/text-field';
import { CategoryIcon } from '@/ideas/idea-visuals';
import { useIdeas } from '@/ideas/ideas-api';
import { haptics } from '@/lib/haptics';
import { useAction } from '@/lib/use-action';
import { useCreatePoll } from '@/polls/polls-api';
import { useTripId } from '@/trips/use-trip-id';

interface OptionDraft {
  key: number;
  label: string;
  startDate: string | null;
  endDate: string | null;
  ideaId: string | null;
}

const PLACEHOLDERS: Record<PollKind, string> = {
  DESTINATION: 'Où part-on cet été ?',
  DATES: 'Quand part-on ?',
  LODGING: 'Où dort-on ?',
  FOOD: 'Où mange-t-on ce soir ?',
  ACTIVITY: 'Qu’est-ce qu’on fait samedi ?',
  YES_NO: 'On loue une voiture ?',
  OTHER: 'Ta question',
};

/** Last moment of a day, on the phone's clock: the poll closes when that day ends. */
const endOfDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d, 23, 59, 59).toISOString();
};

/** A question, at least two options, single choice unless chosen, an optional deadline (CDC §6). */
export default function NouveauSondageScreen() {
  const tripId = useTripId();
  const create = useCreatePoll(tripId);
  const ideas = useIdeas(tripId);
  const nextKey = useRef(2);
  const blank = (key: number): OptionDraft => ({ key, label: '', startDate: null, endDate: null, ideaId: null });
  const [kind, setKind] = useState<PollKind>('DESTINATION');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<OptionDraft[]>([blank(0), blank(1)]);
  const [multiple, setMultiple] = useState(false);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const today = localIsoDate();

  const yesNo = kind === 'YES_NO';
  const withIdeas = IDEA_POLL_KINDS.includes(kind);
  const suggestions = withIdeas ? (ideas.data ?? []).filter((idea) => !options.some((o) => o.ideaId === idea.id)) : [];
  const full = options.length >= MAX_POLL_OPTIONS;

  const update = (key: number, change: Partial<OptionDraft>) => setOptions((list) => list.map((o) => (o.key === key ? { ...o, ...change } : o)));
  const remove = (key: number) => setOptions((list) => list.filter((o) => o.key !== key));
  const add = (draft: Partial<OptionDraft> = {}) => setOptions((list) => [...list, { ...blank(nextKey.current++), ...draft }]);
  /** Fills an empty row first, so picking ideas does not leave blank options behind. */
  const addIdea = (idea: { id: string; title: string }) => {
    const empty = options.find((o) => !o.label.trim() && !o.ideaId);
    if (empty) update(empty.key, { label: idea.title, ideaId: idea.id });
    else add({ label: idea.title, ideaId: idea.id });
  };

  const submit = useAction(async () => {
    // Rows left empty are dropped, as long as two remain.
    const filled = (o: OptionDraft) => (kind === 'DATES' ? o.startDate !== null : o.label.trim() !== '');
    const kept = options.filter((o) => filled(o) || options.filter(filled).length < 2);
    const drafts = yesNo
      ? YES_NO_OPTIONS.map((label) => ({ label }))
      : kept.map((o) =>
          kind === 'DATES'
            ? { label: o.startDate ? dateOptionLabel(o.startDate, o.endDate, today) : '', startDate: o.startDate, endDate: o.endDate }
            : { label: o.label, ideaId: withIdeas ? o.ideaId : null },
        );
    const parsed = createPollRequestSchema.safeParse({
      kind,
      question,
      options: drafts,
      multiple: yesNo ? false : multiple,
      closesAt: deadline ? endOfDay(deadline) : null,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const [field, index, sub] = issue.path;
        // Option errors land on their row; "2 minimum" on the whole list.
        const key = field === 'options' && typeof index === 'number' ? `option.${kept[index]?.key}.${String(sub)}` : String(field);
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    const poll = await create.mutateAsync(parsed.data);
    haptics.success();
    // Straight to sharing it, from the poll itself.
    router.replace(`/voyage/${tripId}/sondage/${poll.id}?partager=1` as Href);
  });

  return (
    <>
      <ScreenHeader mode="close" title="Nouveau sondage" />
      <FormScreen footer={<Button title="Publier le sondage" loading={submit.loading} onPress={() => void submit.run()} />}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kinds} style={styles.kindsRow}>
          {POLL_KINDS.map((k) => {
            const active = k === kind;
            return (
              <Pressable
                key={k}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => setKind(k)}
                style={[styles.kind, active && styles.kindActive]}
              >
                <Text style={[styles.kindText, active && styles.kindTextActive]}>{POLL_KIND_LABELS[k]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <TextField
          label="Question"
          value={question}
          onChangeText={setQuestion}
          placeholder={PLACEHOLDERS[kind]}
          maxLength={120}
          error={errors.question}
        />

        <View style={styles.section}>
          <AppText variant="label">
            Options <Text style={styles.optional}>{yesNo ? '· fixes' : '· 2 minimum'}</Text>
          </AppText>
          {yesNo ? (
            YES_NO_OPTIONS.map((label) => (
              <View key={label} style={styles.option}>
                <Text style={styles.fixedLabel}>{label}</Text>
              </View>
            ))
          ) : (
            <>
              {options.map((o, i) =>
                kind === 'DATES' ? (
                  <View key={o.key} style={styles.dateOption}>
                    <View style={styles.dateHeader}>
                      <AppText variant="bodyStrong" style={styles.flex}>
                        {o.startDate ? dateOptionLabel(o.startDate, o.endDate, today) : `Option ${i + 1}`}
                      </AppText>
                      <RemoveButton label={`Retirer l’option ${i + 1}`} onPress={() => remove(o.key)} disabled={options.length <= 2} />
                    </View>
                    <DateField
                      label="Du"
                      value={o.startDate}
                      minimumDate={today}
                      clearable={false}
                      onChange={(startDate) =>
                        startDate && update(o.key, { startDate, endDate: o.endDate && o.endDate >= startDate ? o.endDate : addDays(startDate, 6) })
                      }
                    />
                    <View style={styles.separator} />
                    <DateField
                      label="Au"
                      value={o.endDate}
                      minimumDate={o.startDate ?? today}
                      clearable={false}
                      onChange={(endDate) => endDate && update(o.key, { endDate })}
                    />
                    <OptionError message={errors[`option.${o.key}.startDate`] ?? errors[`option.${o.key}.endDate`]} />
                  </View>
                ) : (
                  <View key={o.key}>
                    <View style={[styles.option, errors[`option.${o.key}.label`] ? styles.optionError : null]}>
                      {o.ideaId ? <CategoryIcon category={ideas.data?.find((idea) => idea.id === o.ideaId)?.category ?? null} size={18} /> : null}
                      <TextInput
                        accessibilityLabel={`Option ${i + 1}`}
                        value={o.label}
                        // Typing over an idea's title makes it a plain option.
                        onChangeText={(label) => update(o.key, { label, ideaId: null })}
                        placeholder={i === 0 ? 'Split, Croatie' : i === 1 ? 'Naxos, Grèce' : `Option ${i + 1}`}
                        placeholderTextColor={colors.inkSecondary}
                        maxLength={80}
                        style={styles.optionInput}
                      />
                      <RemoveButton label={`Retirer l’option ${i + 1}`} onPress={() => remove(o.key)} disabled={options.length <= 2} />
                    </View>
                    <OptionError message={errors[`option.${o.key}.label`]} />
                  </View>
                ),
              )}
              {errors.options ? <OptionError message={errors.options} /> : null}
              {full ? null : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => add()}
                  style={({ pressed }) => [styles.addOption, pressed && styles.pressed]}
                >
                  <Text style={styles.addOptionText}>+ Ajouter une option</Text>
                </Pressable>
              )}
            </>
          )}
        </View>

        {suggestions.length && !full ? (
          <View style={styles.section}>
            <AppText variant="label">Depuis la boîte à idées</AppText>
            <View style={styles.suggestions}>
              {suggestions.map((idea) => (
                <Pressable key={idea.id} accessibilityRole="button" onPress={() => addIdea(idea)} style={styles.suggestion}>
                  <CategoryIcon category={idea.category} size={16} />
                  <Text style={styles.suggestionText} numberOfLines={1}>
                    {idea.title}
                  </Text>
                  <Icon name="plus" color={colors.accentInk} size={14} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          {yesNo ? null : (
            <>
              <View style={styles.switchRow}>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">Plusieurs choix possibles</AppText>
                  <AppText variant="caption" tone="secondary">
                    Sinon, un seul vote par personne
                  </AppText>
                </View>
                <Switch
                  accessibilityLabel="Plusieurs choix possibles"
                  value={multiple}
                  onValueChange={setMultiple}
                  trackColor={{ true: colors.accent, false: colors.border }}
                />
              </View>
              <View style={styles.separator} />
            </>
          )}
          <DateField label="Date limite" placeholder="Aucune" value={deadline} minimumDate={today} onChange={setDeadline} />
        </View>
        {errors.closesAt ? <OptionError message={errors.closesAt} /> : null}

        {submit.error ? (
          <AppText variant="caption" tone="danger">
            {submit.error}
          </AppText>
        ) : null}
      </FormScreen>
    </>
  );
}

function RemoveButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  if (disabled) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.remove}>
      <Icon name="close" color={colors.inkSecondary} size={16} />
    </Pressable>
  );
}

function OptionError({ message }: { message?: string }) {
  return message ? (
    <AppText variant="caption" tone="danger" style={styles.optionErrorText}>
      {message}
    </AppText>
  ) : null;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  kindsRow: { marginHorizontal: -spacing.xl },
  kinds: { gap: spacing.sm, paddingHorizontal: spacing.xl },
  kind: { height: 36, paddingHorizontal: 13, borderRadius: radii.chip, backgroundColor: colors.chip, justifyContent: 'center' },
  kindActive: { backgroundColor: colors.ink },
  kindText: { fontFamily: fontFamily.semibold, fontSize: 13, color: colors.inkTertiary },
  kindTextActive: { color: colors.surface },
  section: { gap: spacing.sm },
  optional: { fontFamily: fontFamily.medium, color: colors.inkSecondary },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionError: { borderColor: colors.danger },
  optionInput: { flex: 1, minHeight: 48, fontFamily: fontFamily.semibold, fontSize: 15, color: colors.ink },
  fixedLabel: { flex: 1, fontFamily: fontFamily.semibold, fontSize: 15, color: colors.ink },
  optionErrorText: { marginLeft: spacing.xs, marginTop: 2 },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dateOption: { backgroundColor: colors.surface, borderRadius: 16, paddingLeft: 14, paddingRight: 4, paddingVertical: spacing.xs },
  dateHeader: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  addOption: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C9C2B4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOptionText: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.accent },
  pressed: { opacity: 0.7 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: radii.chip,
    backgroundColor: colors.accentTint,
  },
  suggestionText: { flexShrink: 1, fontFamily: fontFamily.semibold, fontSize: 13, color: colors.accentInk },
  card: { backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10 },
  separator: { height: 1, backgroundColor: colors.separator },
});
