import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  MAX_DOCUMENT_BYTES,
  createFileDocumentSchema,
  createLinkDocumentSchema,
  formatFileSize,
  type DocumentCategory,
  type DocumentVisibility,
  type EventCategory,
  type TripDocument,
  type TripEvent,
} from '@7trip/shared';
import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { DateField } from '@/components/ui/date-field';
import { Icon } from '@/components/ui/icon';
import { Segmented } from '@/components/ui/segmented';
import { TextField } from '@/components/ui/text-field';
import { EventPicker } from '@/events/event-picker';

import type { PickedFile } from './documents-api';

export interface DocumentFormValues {
  /** Only when adding: a file sent, or a link. */
  kind: 'FILE' | 'LINK';
  file: PickedFile | null;
  url: string;
  title: string;
  category: DocumentCategory;
  date: string | null;
  event: { id: string; title: string } | null;
  visibility: DocumentVisibility;
  bookingRef: string;
}

/** A planning item gives its kind to a document added from it. */
const EVENT_DOCUMENT_CATEGORY: Record<EventCategory, DocumentCategory> = {
  TRANSPORT: 'TRANSPORT',
  LODGING: 'LODGING',
  ACTIVITY: 'ACTIVITY',
  FOOD: 'OTHER',
  OTHER: 'OTHER',
};

export function newDocumentForm(event: TripEvent | null): DocumentFormValues {
  return {
    kind: 'FILE',
    file: null,
    url: '',
    title: '',
    category: event ? EVENT_DOCUMENT_CATEGORY[event.category] : 'OTHER',
    date: null,
    event: event && { id: event.id, title: event.title },
    // Private by default (CDC §9).
    visibility: 'PRIVATE',
    bookingRef: '',
  };
}

export function documentFormValues(doc: TripDocument): DocumentFormValues {
  return {
    kind: doc.kind,
    file: null,
    url: doc.url ?? '',
    title: doc.title,
    category: doc.category,
    date: doc.ownDate,
    event: doc.event,
    visibility: doc.visibility,
    bookingRef: doc.bookingRef ?? '',
  };
}

/** The fields every document has, as the API takes them. */
export function documentFields(values: DocumentFormValues) {
  return {
    title: values.title,
    category: values.category,
    date: values.date,
    eventId: values.event?.id ?? null,
    visibility: values.visibility,
    bookingRef: values.bookingRef,
  };
}

/** Errors by field, from the shared schemas; `adding`: a file must be picked. */
export function documentFormErrors(values: DocumentFormValues, adding: boolean): Record<string, string> {
  const fields = documentFields(values);
  const parsed = values.kind === 'LINK' ? createLinkDocumentSchema.safeParse({ ...fields, url: values.url }) : createFileDocumentSchema.safeParse(fields);
  const errors: Record<string, string> = {};
  if (!parsed.success) for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
  if (adding && values.kind === 'FILE' && !values.file) errors.file = 'Choisis un fichier ou une photo';
  return errors;
}

/** The name without its extension, as a first title. */
const titleFrom = (name: string) =>
  name
    .replace(/\.[a-z0-9]{2,4}$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .slice(0, 120);

/**
 * Add or edit a document: a PDF or a photo (sent as JPEG, HEIC included), or a link; then its
 * name, kind, date, planning item and who sees it.
 */
export function DocumentForm({
  tripId,
  values,
  onChange,
  errors,
  adding,
}: {
  tripId: string;
  values: DocumentFormValues;
  onChange: (values: DocumentFormValues) => void;
  errors: Record<string, string | undefined>;
  adding: boolean;
}) {
  const set = <K extends keyof DocumentFormValues>(key: K, value: DocumentFormValues[K]) => onChange({ ...values, [key]: value });
  const [pickingEvent, setPickingEvent] = useState(false);

  const picked = (file: PickedFile) => {
    if (file.size && file.size > MAX_DOCUMENT_BYTES) {
      Alert.alert('Fichier trop lourd', `${formatFileSize(file.size)} : 20 Mo maximum par fichier.`);
      return;
    }
    onChange({ ...values, file, title: values.title || titleFrom(file.name) });
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    picked({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'application/pdf',
      size: asset.size ?? null,
    });
  };

  const pickPhoto = async () => {
    // Compatible: iOS hands HEIC photos over as JPEG, which the API accepts.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    const name = (asset.fileName ?? 'photo.jpg').replace(/\.(heic|heif)$/i, '.jpg');
    picked({
      uri: asset.uri,
      name,
      mimeType: asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg',
      size: asset.fileSize ?? null,
    });
  };

  return (
    <>
      {adding ? (
        <Segmented
          options={[
            { value: 'FILE', label: 'Fichier' },
            { value: 'LINK', label: 'Lien' },
          ]}
          value={values.kind}
          onChange={(kind) => set('kind', kind)}
        />
      ) : null}

      {adding && values.kind === 'FILE' ? (
        <View style={styles.section}>
          {values.file ? (
            <View style={styles.file}>
              <Icon name="folder" color={colors.accentInk} size={20} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {values.file.name}
                </AppText>
                {values.file.size ? (
                  <AppText variant="caption" tone="secondary">
                    {formatFileSize(values.file.size)}
                  </AppText>
                ) : null}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Retirer le fichier" hitSlop={8} onPress={() => set('file', null)}>
                <Icon name="close" color={colors.inkSecondary} size={18} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.pickers}>
              <Pressable accessibilityRole="button" onPress={() => void pickFile()} style={({ pressed }) => [styles.picker, pressed && styles.pressed]}>
                <Icon name="folder" color={colors.accentInk} size={22} />
                <Text style={styles.pickerText}>PDF ou image</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => void pickPhoto()} style={({ pressed }) => [styles.picker, pressed && styles.pressed]}>
                <Icon name="image" color={colors.accentInk} size={22} />
                <Text style={styles.pickerText}>Photo</Text>
              </Pressable>
            </View>
          )}
          <AppText variant="caption" tone={errors.file ? 'danger' : 'secondary'}>
            {errors.file ?? 'PDF, JPEG ou PNG, 20 Mo maximum.'}
          </AppText>
        </View>
      ) : null}

      {values.kind === 'LINK' ? (
        <TextField
          label="Lien"
          value={values.url}
          onChangeText={(url) => set('url', url)}
          placeholder="sixt.fr/ma-reservation"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          error={errors.url}
        />
      ) : null}

      <TextField
        label="Nom"
        value={values.title}
        onChangeText={(title) => set('title', title)}
        placeholder="Billets Alcázar"
        maxLength={120}
        error={errors.title}
      />

      <View style={styles.section}>
        <AppText variant="label">Qui le voit ?</AppText>
        <Segmented
          options={[
            { value: 'PRIVATE', label: 'Moi seul' },
            { value: 'SHARED', label: 'Tout le groupe' },
          ]}
          value={values.visibility}
          onChange={(visibility) => set('visibility', visibility)}
        />
        <AppText variant="caption" tone="secondary">
          {values.visibility === 'PRIVATE'
            ? 'Privé : personne d’autre ne peut l’ouvrir, même avec un lien.'
            : 'Partagé : chaque participant du voyage peut l’ouvrir.'}
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="label">Catégorie</AppText>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {DOCUMENT_CATEGORIES.map((category) => {
            const active = values.category === category;
            return (
              <Pressable
                key={category}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => set('category', category)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{DOCUMENT_CATEGORY_LABELS[category]}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="label">Lié au planning</AppText>
        <Pressable accessibilityRole="button" onPress={() => setPickingEvent(true)} style={styles.row}>
          <Icon name="calendar" color={values.event ? colors.accentInk : colors.inkSecondary} size={18} />
          <Text style={[styles.rowText, !values.event && styles.off]} numberOfLines={1}>
            {values.event?.title ?? 'Aucun'}
          </Text>
          <Icon name="chevronRight" color={colors.inkSecondary} size={16} />
        </Pressable>
        {errors.eventId ? (
          <AppText variant="caption" tone="danger">
            {errors.eventId}
          </AppText>
        ) : null}
      </View>
      <EventPicker
        visible={pickingEvent}
        tripId={tripId}
        value={values.event?.id ?? null}
        onSelect={(event) => set('event', event && { id: event.id, title: event.title })}
        onClose={() => setPickingEvent(false)}
      />

      <DateField
        label={values.event ? 'Date (sinon celle de l’événement)' : 'Date'}
        value={values.date}
        onChange={(date) => set('date', date)}
        placeholder="Sans date"
      />

      <TextField
        label="Référence de réservation"
        value={values.bookingRef}
        onChangeText={(bookingRef) => set('bookingRef', bookingRef)}
        placeholder="Facultatif"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={60}
        error={errors.bookingRef}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  section: { gap: spacing.sm },
  pickers: { flexDirection: 'row', gap: spacing.sm },
  picker: {
    flex: 1,
    minHeight: 88,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
  },
  pickerText: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: colors.ink,
  },
  pressed: { opacity: 0.6 },
  file: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.accentTint,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radii.chip,
    backgroundColor: colors.chip,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.ink },
  chipText: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: colors.inkTertiary,
  },
  chipTextActive: { color: colors.surface },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  rowText: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: colors.ink,
  },
  off: { color: '#8C8A84' },
});
