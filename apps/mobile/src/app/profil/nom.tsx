import { AVATAR_COLORS, updateMeRequestSchema, type AvatarColor, type Me } from '@7trip/shared';
import { avatarColors, colors, spacing } from '@7trip/ui-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { Avatar } from '@/components/avatar';
import { Sheet } from '@/components/sheet';
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
    <Sheet title="Mon profil">
      <View style={styles.identity}>
        <Avatar name={displayName.trim() || '?'} color={avatarColor} size={64} />
        <AppText tone="secondary" style={styles.flex}>
          Ton nom et ta couleur sont visibles par les personnes de tes voyages.
        </AppText>
      </View>
      <TextField
        label="Prénom ou pseudo"
        value={displayName}
        onChangeText={setDisplayName}
        error={localError ?? save.fieldErrors.displayName ?? save.error}
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
      <Button title="Enregistrer" loading={save.loading} onPress={() => void save.run()} />
    </Sheet>
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
  flex: { flex: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
