import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  formatDayMonth,
  weekday,
  type DocumentCategory,
  type TripDocument,
} from "@7trip/shared";
import { colors, fontFamily, radii, spacing } from "@7trip/ui-tokens";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ScreenHeader } from "@/components/screen-header";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  DocumentTile,
  VisibilityLabel,
  documentMeta,
} from "@/documents/document-visuals";
import { useDocuments } from "@/documents/documents-api";
import { useTripId } from "@/trips/use-trip-id";

type Filter = "all" | DocumentCategory;

/** By date, a section per day; "Sans date" at the end (CDC §9). The API sends them in that order. */
function groups(
  docs: TripDocument[],
): { label: string; docs: TripDocument[] }[] {
  const result: { label: string; docs: TripDocument[] }[] = [];
  for (const doc of docs) {
    const label = doc.date
      ? `${weekday(doc.date)} ${formatDayMonth(doc.date)}`
      : "Sans date";
    const last = result.at(-1);
    if (last?.label === label) last.docs.push(doc);
    else result.push({ label, docs: [doc] });
  }
  return result;
}

export default function DocumentsScreen() {
  const tripId = useTripId();
  const documents = useDocuments(tripId);
  const [filter, setFilter] = useState<Filter>("all");
  const { refetch } = documents;
  // Others add documents meanwhile: fetched again on each visit.
  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
    }, [refetch]),
  );
  const add = () => router.push(`/voyage/${tripId}/document/nouveau` as Href);
  const all = documents.data ?? [];
  const shown = all.filter(
    (doc) => filter === "all" || doc.category === filter,
  );

  return (
    <>
      <ScreenHeader title="Documents" />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={documents.isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.accent}
          />
        }
      >
        {documents.isPending ? (
          <ActivityIndicator color={colors.accent} style={styles.loading} />
        ) : documents.isError && !documents.data ? (
          <View style={styles.empty}>
            <AppText variant="heading">
              Impossible de charger les documents
            </AppText>
            <AppText tone="secondary">{documents.error.message}</AppText>
            <Button
              title="Réessayer"
              variant="soft"
              onPress={() => void refetch()}
            />
          </View>
        ) : all.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="folder" color={colors.accentInk} size={26} />
            </View>
            <AppText variant="heading">Aucun document pour l’instant</AppText>
            <AppText tone="secondary">
              Billets, réservations, assurance… Garde-les ici, pour toi seul ou
              pour tout le groupe.
            </AppText>
            <Button
              title="Ajouter un document"
              onPress={add}
              icon={<Icon name="plus" color={colors.surface} size={20} />}
            />
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
            >
              {(["all", ...DOCUMENT_CATEGORIES] as const).map((value) => {
                const active = filter === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setFilter(value)}
                    style={[styles.filter, active && styles.filterActive]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        active && styles.filterTextActive,
                      ]}
                    >
                      {value === "all"
                        ? "Tous"
                        : DOCUMENT_CATEGORY_LABELS[value]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {shown.length === 0 ? (
              <AppText tone="secondary">
                Aucun document dans cette catégorie.
              </AppText>
            ) : null}
            {groups(shown).map((group) => (
              <View key={group.label} style={styles.group}>
                <AppText variant="label" tone="secondary">
                  {group.label}
                </AppText>
                <View style={styles.card}>
                  {group.docs.map((doc, index) => (
                    <Pressable
                      key={doc.id}
                      accessibilityRole="button"
                      onPress={() =>
                        router.push(
                          `/voyage/${tripId}/document/${doc.id}` as Href,
                        )
                      }
                      style={({ pressed }) => [
                        styles.row,
                        index > 0 && styles.rowBorder,
                        pressed && styles.pressed,
                      ]}
                    >
                      <DocumentTile doc={doc} />
                      <View style={styles.flex}>
                        <AppText variant="bodyStrong" numberOfLines={2}>
                          {doc.title}
                        </AppText>
                        <View style={styles.meta}>
                          <VisibilityLabel visibility={doc.visibility} />
                          <AppText
                            variant="caption"
                            tone="secondary"
                            numberOfLines={1}
                            style={styles.flex}
                          >
                            · {documentMeta(doc)}
                          </AppText>
                        </View>
                      </View>
                      <Icon
                        name="chevronRight"
                        color={colors.inkSecondary}
                        size={16}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      {all.length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ajouter un document"
          onPress={add}
          style={styles.fab}
        >
          <Icon name="plus" color={colors.surface} size={26} />
        </Pressable>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    gap: spacing.lg,
  },
  flex: { flex: 1, minWidth: 0 },
  loading: { marginTop: spacing.xxl },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  filters: { gap: spacing.sm },
  filter: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radii.chip,
    backgroundColor: colors.chip,
    justifyContent: "center",
  },
  filterActive: { backgroundColor: colors.ink },
  filterText: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: colors.inkTertiary,
  },
  filterTextActive: { color: colors.surface },
  group: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 68,
    paddingVertical: 10,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.separator },
  pressed: { opacity: 0.6 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xxl,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
});
