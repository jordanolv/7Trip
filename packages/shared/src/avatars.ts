/** Avatar colours a person can pick in their profile (docs/decisions.md, "Profil et avatars"). */
export const AVATAR_COLORS = ['sage', 'sky', 'sand', 'peach', 'lilac', 'rose', 'periwinkle', 'stone'] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number];

/**
 * Colour of someone who has not picked one: always the same for the same seed (the account id, or
 * the participant id of a guest), so a person keeps their colour across screens and devices.
 */
export function defaultAvatarColor(seed: string): AvatarColor {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}

/** The colour shown for a participant: their own choice, else the default of their account (or of the guest). */
export const participantAvatarColor = (p: { id: string; userId: string | null; avatarColor: AvatarColor | null }): AvatarColor =>
  p.avatarColor ?? defaultAvatarColor(p.userId ?? p.id);
