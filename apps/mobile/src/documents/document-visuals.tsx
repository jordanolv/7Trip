import {
  DOCUMENT_CATEGORY_LABELS,
  type DocumentCategory,
  type TripDocument,
} from "@7trip/shared";
import { colors, fontFamily } from "@7trip/ui-tokens";
import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";

/** Tints of the mockup (G-Documents), by category. */
export const DOCUMENT_STYLES: Record<
  DocumentCategory,
  { tint: string; ink: string }
> = {
  TRANSPORT: { tint: "#C8E0EA", ink: "#1F5F7A" },
  LODGING: { tint: "#E4E6F7", ink: "#2F3680" },
  ACTIVITY: { tint: "#E3EFE8", ink: "#22553F" },
  OTHER: { tint: "#F2EDE4", ink: "#3A4352" },
};

/** "PDF", "IMG" or "LIEN" on the category's tint. */
export function DocumentTile({
  doc,
  size = 44,
}: {
  doc: Pick<TripDocument, "kind" | "mime" | "category">;
  size?: number;
}) {
  const { tint, ink } = DOCUMENT_STYLES[doc.category];
  const label =
    doc.kind === "LINK"
      ? "LIEN"
      : doc.mime === "application/pdf"
        ? "PDF"
        : "IMG";
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, backgroundColor: tint },
      ]}
    >
      <Text style={[styles.tileText, { color: ink }]}>{label}</Text>
    </View>
  );
}

/** Privé (lock) or Partagé (people). */
export function VisibilityLabel({
  visibility,
}: {
  visibility: TripDocument["visibility"];
}) {
  const priv = visibility === "PRIVATE";
  const color = priv ? "#8A3D12" : "#22553F";
  return (
    <View style={styles.visibility}>
      <Icon name={priv ? "lock" : "users"} color={color} size={13} />
      <Text style={[styles.visibilityText, { color }]}>
        {priv ? "Privé" : "Partagé"}
      </Text>
    </View>
  );
}

/** What the list shows under the title: the planning item, else the reference, else the category. */
export function documentMeta(doc: TripDocument): string {
  if (doc.event) return `Lié à « ${doc.event.title} »`;
  if (doc.bookingRef) return `Réf. ${doc.bookingRef}`;
  return DOCUMENT_CATEGORY_LABELS[doc.category];
}

const styles = StyleSheet.create({
  tile: { borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tileText: {
    fontFamily: fontFamily.extrabold,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  visibility: { flexDirection: "row", alignItems: "center", gap: 3 },
  visibilityText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.ink,
  },
});
