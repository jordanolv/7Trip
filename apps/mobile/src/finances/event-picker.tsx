import { formatDayMonth, type TripEvent } from "@7trip/shared";
import { colors, spacing } from "@7trip/ui-tokens";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { EventIcon } from "@/events/event-visuals";
import { useEvents } from "@/events/events-api";

/** The planning items, by date, in a sheet over the form: the one the expense was paid for. */
export function EventPicker({
  visible,
  tripId,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  tripId: string;
  value: string | null;
  onSelect: (event: TripEvent | null) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const events = useEvents(tripId);
  const sorted = [...(events.data ?? [])].sort((a, b) =>
    `${a.startDate} ${a.startTime ?? ""}`.localeCompare(
      `${b.startDate} ${b.startTime ?? ""}`,
    ),
  );
  const pick = (event: TripEvent | null) => {
    onSelect(event);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <View style={styles.side} />
          <AppText variant="heading" style={styles.title}>
            Lier au planning
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            onPress={onClose}
            style={styles.side}
          >
            <Icon name="close" size={22} />
          </Pressable>
        </View>
        {events.isPending ? (
          <ActivityIndicator color={colors.accent} style={styles.loading} />
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={(event) => event.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: value === null }}
                onPress={() => pick(null)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={styles.icon}>
                  <Icon name="close" color={colors.inkSecondary} size={18} />
                </View>
                <AppText variant="bodyStrong" style={styles.flex}>
                  Aucun
                </AppText>
                {value === null ? (
                  <Icon name="check" color={colors.accentInk} size={20} />
                ) : null}
              </Pressable>
            }
            renderItem={({ item: event }) => {
              const active = event.id === value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  onPress={() => pick(event)}
                  style={({ pressed }) => [
                    styles.row,
                    styles.rowBorder,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.icon}>
                    <EventIcon category={event.category} size={18} />
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {event.title}
                    </AppText>
                    <AppText variant="caption" tone="secondary">
                      {formatDayMonth(event.startDate)}
                      {event.startTime ? ` · ${event.startTime}` : ""}
                    </AppText>
                  </View>
                  {active ? (
                    <Icon name="check" color={colors.accentInk} size={20} />
                  ) : null}
                </Pressable>
              );
            }}
            ListFooterComponent={
              sorted.length === 0 ? (
                <AppText tone="secondary" style={styles.empty}>
                  Rien au planning pour l’instant.
                </AppText>
              ) : undefined
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  side: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, textAlign: "center" },
  loading: { marginTop: spacing.xxl },
  list: {
    margin: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 56,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.separator },
  pressed: { opacity: 0.6 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.chip,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { paddingVertical: spacing.lg, textAlign: "center" },
});
