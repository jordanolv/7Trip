import {
  DOCUMENT_CATEGORY_LABELS,
  authorName,
  formatDayMonth,
  formatFileSize,
  weekday,
  type TripDocument,
} from "@7trip/shared";
import { colors, spacing } from "@7trip/ui-tokens";
import { router, useLocalSearchParams, type Href } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { Sheet } from "@/components/sheet";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { DocumentTile, VisibilityLabel } from "@/documents/document-visuals";
import {
  useDeleteDocument,
  useDocument,
  useOpenDocument,
} from "@/documents/documents-api";
import { errorMessage } from "@/lib/api";
import { haptics } from "@/lib/haptics";
import { useTripId } from "@/trips/use-trip-id";

export default function DocumentScreen() {
  const tripId = useTripId();
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const doc = useDocument(tripId, documentId);
  if (!doc.data) {
    return (
      <Sheet title="Document">
        {doc.isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <AppText tone="secondary">{doc.error?.message}</AppText>
        )}
      </Sheet>
    );
  }
  return <DocumentDetail tripId={tripId} doc={doc.data} />;
}

function DocumentDetail({
  tripId,
  doc,
}: {
  tripId: string;
  doc: TripDocument;
}) {
  const open = useOpenDocument(tripId);
  const remove = useDeleteDocument(tripId, doc.id);
  const details = [
    DOCUMENT_CATEGORY_LABELS[doc.category],
    doc.date ? `${weekday(doc.date)} ${formatDayMonth(doc.date)}` : "Sans date",
    doc.sizeBytes ? formatFileSize(doc.sizeBytes) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const confirmDelete = () => {
    haptics.warning();
    Alert.alert(
      "Supprimer le document ?",
      doc.visibility === "SHARED"
        ? "Il disparaîtra pour tout le groupe."
        : "Il sera supprimé définitivement.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () =>
            remove.mutate(undefined, {
              onSuccess: () => router.back(),
              onError: (error) =>
                Alert.alert("Impossible de supprimer", errorMessage(error)),
            }),
        },
      ],
    );
  };

  return (
    <Sheet title="Document">
      <View style={styles.top}>
        <DocumentTile doc={doc} size={52} />
        <View style={styles.flex}>
          <AppText variant="heading" numberOfLines={3}>
            {doc.title}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {details}
          </AppText>
        </View>
      </View>
      <View style={styles.line}>
        <VisibilityLabel visibility={doc.visibility} />
        <AppText variant="caption" tone="secondary">
          · ajouté par {doc.canEdit ? "toi" : authorName(doc.owner)}
        </AppText>
      </View>
      {doc.bookingRef ? (
        <AppText tone="secondary">Réf. {doc.bookingRef}</AppText>
      ) : null}
      {doc.event ? (
        <Pressable
          accessibilityRole="link"
          onPress={() =>
            router.push(`/voyage/${tripId}/evenement/${doc.event!.id}` as Href)
          }
          style={({ pressed }) => [styles.event, pressed && styles.pressed]}
        >
          <Icon name="calendar" color={colors.accentInk} size={18} />
          <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
            {doc.event.title}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {formatDayMonth(doc.event.startDate)}
          </AppText>
          <Icon name="chevronRight" color={colors.inkSecondary} size={16} />
        </Pressable>
      ) : null}

      <View style={styles.actions}>
        <Button
          title={doc.kind === "LINK" ? "Ouvrir le lien" : "Ouvrir"}
          loading={open.isPending}
          onPress={() =>
            open.mutate(doc, {
              onError: (error) =>
                Alert.alert(
                  "Impossible d’ouvrir le document",
                  errorMessage(error),
                ),
            })
          }
        />
        {doc.canEdit ? (
          <Button
            title="Modifier"
            variant="soft"
            onPress={() =>
              router.push(
                `/voyage/${tripId}/document/${doc.id}/modifier` as Href,
              )
            }
          />
        ) : null}
        {doc.canDelete ? (
          <Button
            title="Supprimer"
            variant="ghost"
            loading={remove.isPending}
            onPress={confirmDelete}
          />
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  line: { flexDirection: "row", alignItems: "center", gap: 4 },
  event: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.accentTint,
  },
  pressed: { opacity: 0.6 },
  actions: { gap: spacing.sm },
});
