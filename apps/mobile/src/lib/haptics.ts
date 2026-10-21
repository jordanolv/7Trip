import * as Haptics from 'expo-haptics';

// Fire and forget: a device without a haptic engine just stays silent.
const ignore = () => {};

export const haptics = {
  /** Something appeared under the finger: swipe actions, a long-press menu. */
  tick: () => void Haptics.selectionAsync().catch(ignore),
  press: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(ignore),
  success: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(ignore),
  /** Before a destructive confirmation. */
  warning: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(ignore),
};
