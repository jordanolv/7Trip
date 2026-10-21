import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import { useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Pressable as GesturePressable, type PressableStateCallbackType } from 'react-native-gesture-handler';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Icon, type IconName } from './ui/icon';

export interface SwipeAction {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

/**
 * A row that swipes left to reveal actions. `card` actions are separate rounded tiles (for cards in a list);
 * `inline` actions fill the row's height edge to edge (for rows inside a card).
 */
export function SwipeRow({
  actions,
  variant,
  onPress,
  style,
  accessibilityLabel,
  children,
}: {
  actions: SwipeAction[];
  variant: 'card' | 'inline';
  onPress?: () => void;
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
  accessibilityLabel?: string;
  children: ReactNode;
}) {
  const swipeable = useRef<SwipeableMethods>(null);
  const shown = useRef(false);
  // A tap while the actions are shown puts the row back instead of triggering it.
  const press = () => (shown.current ? swipeable.current?.close() : onPress?.());

  return (
    <Swipeable
      ref={swipeable}
      enabled={actions.length > 0}
      onSwipeableWillOpen={() => (shown.current = true)}
      onSwipeableClose={() => (shown.current = false)}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={(_progress, _translation, methods) => (
        <View style={variant === 'card' ? styles.cardActions : styles.inlineActions}>
          {actions.map((action) => (
            <ActionButton
              key={action.label}
              action={action}
              variant={variant}
              onPress={() => {
                methods.close();
                action.onPress();
              }}
            />
          ))}
        </View>
      )}
    >
      {/* Gesture-handler's Pressable, so a swipe cancels the tap instead of firing it on release. */}
      <GesturePressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={actions.length > 0 ? `Glisse vers la gauche : ${actions.map((a) => a.label).join(', ')}` : undefined}
        accessibilityActions={actions.map((a) => ({ name: a.label, label: a.label }))}
        onAccessibilityAction={(event) => actions.find((a) => a.label === event.nativeEvent.actionName)?.onPress()}
        onPress={press}
        style={style}
      >
        {children}
      </GesturePressable>
    </Swipeable>
  );
}

function ActionButton({ action, variant, onPress }: { action: SwipeAction; variant: 'card' | 'inline'; onPress: () => void }) {
  const color = action.danger ? colors.danger : colors.accentInk;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPress={onPress}
      style={[styles.action, variant === 'card' && styles.actionCard, action.danger && styles.actionDanger]}
    >
      <Icon name={action.icon} color={color} size={variant === 'card' ? 22 : 20} />
      <Text style={[styles.actionText, { color }]}>{action.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardActions: { flexDirection: 'row', gap: spacing.sm, paddingLeft: spacing.sm },
  inlineActions: { flexDirection: 'row' },
  action: { width: 84, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center', gap: 4 },
  actionCard: { width: 76, borderRadius: radii.card, gap: 6 },
  actionDanger: { backgroundColor: colors.dangerTint },
  actionText: { fontFamily: fontFamily.bold, fontSize: 12 },
});
