import { CURRENCY_CODES, currencyLabel, currencySymbol, type CurrencyCode } from '@7trip/shared';
import { colors, fontFamily, spacing } from '@7trip/ui-tokens';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';

/** The trip's currency first, then the usual ones for a trip, then the rest as listed. */
const order = (first: string) => [first, ...CURRENCY_CODES.filter((code) => code !== first)];

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** A searchable list of the currencies, in a sheet over the current screen. */
export function CurrencyPicker({
  visible,
  value,
  first,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: string;
  /** Listed first: the trip's currency. */
  first: string;
  onSelect: (currency: CurrencyCode) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const query = normalize(search.trim());
  const codes = order(first).filter((code) => !query || normalize(`${code} ${currencyLabel(code)}`).includes(query)) as CurrencyCode[];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} onDismiss={() => setSearch('')}>
      <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <View style={styles.side} />
          <AppText variant="heading" style={styles.title}>
            Devise
          </AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={styles.side}>
            <Icon name="close" size={22} />
          </Pressable>
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Dollar, MAD, yen…"
          placeholderTextColor={colors.inkSecondary}
          autoCorrect={false}
          clearButtonMode="while-editing"
          style={styles.search}
        />
        <FlatList
          data={codes}
          keyExtractor={(code) => code}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          renderItem={({ item: code, index }) => {
            const active = code === value;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => {
                  onSelect(code);
                  onClose();
                }}
                style={({ pressed }) => [styles.row, index > 0 && styles.rowBorder, pressed && styles.pressed]}
              >
                <Text style={styles.symbol}>{currencySymbol(code)}</Text>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{currencyLabel(code)}</AppText>
                  <AppText variant="caption" tone="secondary">
                    {code}
                    {code === first ? ' · devise du voyage' : ''}
                  </AppText>
                </View>
                {active ? <Icon name="check" color={colors.accentInk} size={20} /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <AppText tone="secondary" style={styles.empty}>
              Aucune devise ne correspond.
            </AppText>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheet: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  side: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center' },
  search: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontFamily: fontFamily.medium,
    fontSize: 16,
    color: colors.ink,
  },
  list: { margin: spacing.lg, backgroundColor: colors.surface, borderRadius: 18, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.separator },
  pressed: { opacity: 0.6 },
  symbol: { width: 44, fontFamily: fontFamily.extrabold, fontSize: 16, color: colors.inkTertiary, textAlign: 'center' },
  empty: { paddingVertical: spacing.lg, textAlign: 'center' },
});
