import { formatDistance, type PlaceSuggestion } from '@7trip/shared';
import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { TextField } from '@/components/ui/text-field';
import { useTripId } from '@/trips/use-trip-id';

import { newPlaceSession, useLookupPlace, usePlaceSearch } from './places-api';

export interface PlaceValue {
  /** The name shown and stored ("Plaza de España"), typed or picked. */
  place: string;
  /** Set once a Google suggestion is picked; typing again drops it. */
  placeId: string | null;
  /** The picked place's address, to show it is the right one. */
  address: string | null;
}

const DEBOUNCE_MS = 300;

/**
 * "Lieu": typed freely, or picked among Google's suggestions shown under it as one types (mockup
 * I-Lieu). A picked place gets its address and position, so it opens exactly in Google Maps and
 * will show on the map. Without a pick, the text is kept as it is.
 */
export function PlaceField({
  value,
  onChange,
  error,
  placeholder,
}: {
  value: PlaceValue;
  onChange: (value: PlaceValue) => void;
  error?: string;
  placeholder?: string;
}) {
  const tripId = useTripId();
  const lookup = useLookupPlace(tripId);
  const [session, setSession] = useState(newPlaceSession);
  const [focused, setFocused] = useState(false);
  const [typed, setTyped] = useState(false);
  const [query, setQuery] = useState(value.place);
  const [picking, setPicking] = useState<string | null>(null);

  // Searched a moment after the last letter, not at each one.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(value.place), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value.place]);

  const searching = focused && typed && !value.placeId;
  const search = usePlaceSearch(tripId, query, session, searching);
  const suggestions = searching && query.trim().length >= 2 ? (search.data ?? []) : [];
  const unavailable = searching && search.isError;

  const pick = async (suggestion: PlaceSuggestion) => {
    setPicking(suggestion.placeId);
    try {
      const details = await lookup(suggestion.placeId, session);
      onChange({ place: suggestion.name.slice(0, 120), placeId: details.placeId, address: details.address });
    } catch {
      // Not found any more, or Google unreachable: the name alone, as typed.
      onChange({ place: suggestion.name.slice(0, 120), placeId: null, address: null });
    } finally {
      setPicking(null);
      setTyped(false);
      // The pick ends the session: the next search starts a new one.
      setSession(newPlaceSession());
    }
  };

  return (
    <View style={styles.wrapper}>
      <TextField
        label="Lieu"
        value={value.place}
        onChangeText={(place) => {
          setTyped(true);
          onChange({ place, placeId: null, address: null });
        }}
        onFocus={() => setFocused(true)}
        // A moment later: a tap on a suggestion must land before the list goes.
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        placeholder={placeholder ?? 'Cherche un lieu ou une adresse'}
        maxLength={120}
        autoCorrect={false}
        error={error}
      />

      {value.placeId ? (
        <View style={styles.picked}>
          <Icon name="pin" size={16} color={colors.accentInk} />
          <AppText variant="caption" style={styles.pickedText} numberOfLines={2}>
            {value.address ?? 'Lieu trouvé sur Google Maps'}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retirer le lieu choisi"
            hitSlop={8}
            onPress={() => {
              setTyped(true);
              onChange({ place: value.place, placeId: null, address: null });
            }}
          >
            <Icon name="close" size={16} color={colors.accentInk} />
          </Pressable>
        </View>
      ) : null}

      {suggestions.length > 0 ? (
        <View style={styles.list} accessibilityRole="list">
          {suggestions.map((suggestion, index) => (
            <Pressable
              key={suggestion.placeId}
              accessibilityRole="button"
              accessibilityLabel={`${suggestion.name}${suggestion.detail ? `, ${suggestion.detail}` : ''}`}
              onPress={() => void pick(suggestion)}
              disabled={picking !== null}
              style={({ pressed }) => [styles.row, index > 0 && styles.rowBorder, pressed && styles.rowPressed]}
            >
              <View style={styles.rowIcon}>
                {picking === suggestion.placeId ? <ActivityIndicator size="small" color={colors.accent} /> : <Icon name="pin" size={18} color={colors.inkTertiary} />}
              </View>
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={1}>
                  {suggestion.name}
                </Text>
                {suggestion.detail ? (
                  <Text style={styles.detail} numberOfLines={1}>
                    {suggestion.detail}
                  </Text>
                ) : null}
              </View>
              {suggestion.distanceMeters !== null ? <Text style={styles.distance}>{formatDistance(suggestion.distanceMeters)}</Text> : null}
            </Pressable>
          ))}
          <Text style={styles.attribution}>Résultats Google</Text>
        </View>
      ) : null}

      {unavailable ? (
        <AppText variant="caption" tone="secondary">
          Recherche indisponible pour l’instant : le lieu sera gardé tel que tu l’écris.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  picked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentTint,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  pickedText: { flex: 1, color: colors.accentInk },
  list: { backgroundColor: colors.surface, borderRadius: radii.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 56 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.chipSoft },
  rowPressed: { backgroundColor: colors.accentTint },
  rowIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.chipSoft, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0 },
  name: { fontFamily: fontFamily.bold, fontSize: 15, color: colors.ink },
  detail: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.inkSecondary, marginTop: 1 },
  distance: { fontFamily: fontFamily.semibold, fontSize: 12, color: colors.inkSecondary },
  attribution: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.inkSecondary, textAlign: 'right', paddingHorizontal: 14, paddingBottom: 8 },
});
