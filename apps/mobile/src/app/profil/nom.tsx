import { AVATAR_COLORS, updateMeRequestSchema, type AvatarColor, type Me } from '@7trip/shared';
import { avatarColors, colors, spacing } from '@7trip/ui-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { Avatar } from '@/components/avatar';
import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { TextField } from '@/components/ui/text-field';
import { useAction } from '@/lib/use-action';

/** Name and avatar colour, both shown to the people of your trips. */
export default function ModifierProfilScreen() {
  const { user, authedRequest, setUser } = useAuth();
  const client = useQueryClient();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [avatarColor, setAvatarColor] = useState<AvatarColor>(user?.avatarColor ?? 'sage');
  const [localError, setLocalError] = useState<string | null>(null);

  const save = useAction(async () => {
    const parsed = updateMeRequestSchema.safeParse({ displayName, avatarColor });
    if (!parsed.success) {
      setLocalError(parsed.error.issues[0]?.message ?? 'Nom invalide');
      return;
    }
    setLocalError(null);
    setUser(await authedRequest<Me>('/me', { method: 'PATCH', body: parsed.data }));
    // The name and colour are copied into every trip, its ideas, events and polls: all of it is
    // refetched, starting with the screen this modal was opened from.
    void client.invalidateQueries();
    router.back();
  });

  return (
    <>
      <ScreenHeader mode="close" title="Mon profil" />
      <FormScreen footer={<Button title="Enregistrer" loading={save.loading} onPress={() => void save.run()} />}>
        <View style={styles.preview}>
          <Avatar name={displayName.trim() || '?'} color={avatarColor} size={88} />
        </View>
        <View>
          <AppText variant="title">Comment t’appelle-t-on ?</AppText>
          <AppText tone="secondary">Ton nom et ta couleur sont visibles par les personnes de tes voyages.</AppText>
        </View>
        <TextField
          label="Prénom ou pseudo"
          value={displayName}
          onChangeText={setDisplayName}
          error={localError ?? save.fieldErrors.displayName ?? save.error}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => void save.run()}
        />
        <View style={styles.colorsBlock}>
          <AppText variant="label" tone="secondary">
            Couleur de ton avatar
          </AppText>
          <View style={styles.palette}>
            {AVATAR_COLORS.map((key) => {
              const selected = key === avatarColor;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityLabel={`Couleur ${COLOR_NAMES[key]}`}
                  accessibilityState={{ selected }}
                  onPress={() => setAvatarColor(key)}
                  style={[styles.swatch, { backgroundColor: avatarColors[key].bg }, selected && { borderColor: avatarColors[key].ink }]}
                >
                  {selected ? <Icon name="check" color={avatarColors[key].ink} size={20} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </FormScreen>
    </>
  );
}

const COLOR_NAMES: Record<AvatarColor, string> = {
  sage: 'sauge',
  sky: 'ciel',
  sand: 'sable',
  peach: 'pêche',
  lilac: 'lilas',
  rose: 'rose',
  periwinkle: 'pervenche',
  stone: 'pierre',
};

const styles = StyleSheet.create({
  preview: { alignItems: 'center', paddingVertical: spacing.sm },
  colorsBlock: { gap: spacing.sm },
  // One even row of 8, whatever the screen width.
  palette: { flexDirection: 'row', gap: spacing.sm },
  swatch: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 48,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
