import { authorName, formatDayMonth, localIsoDate, weekdayShort, type ContentAuthor, type Poll, type PollKind } from '@7trip/shared';
import { colors, fontFamily, radii, tripIconPaths } from '@7trip/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Avatar } from '@/components/avatar';

/** Tint, ink and stroke icon of each kind, in the colours of the idea categories. */
const KIND_STYLES: Record<PollKind, { tint: string; ink: string; path: string }> = {
  DESTINATION: { tint: '#C8E0EA', ink: '#1F5F7A', path: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5z' },
  DATES: { tint: '#DCD6EC', ink: '#4A3C75', path: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4' },
  LODGING: { tint: '#F1E2B8', ink: '#7A5A08', path: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  FOOD: { tint: '#FBE6D8', ink: '#8A3D12', path: tripIconPaths.food },
  ACTIVITY: { tint: colors.accentTint, ink: colors.accentInk, path: 'M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM14 7v10' },
  YES_NO: { tint: '#F1CFDE', ink: '#8E2A57', path: 'M5 12l5 5 9-10' },
  OTHER: { tint: colors.chipSoft, ink: colors.inkTertiary, path: 'M6 20V11M12 20V5M18 20v-6' },
};

export function PollKindTile({ kind, size = 44 }: { kind: PollKind; size?: number }) {
  const style = KIND_STYLES[kind];
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.27, backgroundColor: style.tint }]}>
      <Svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill="none" stroke={style.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d={style.path} />
      </Svg>
    </View>
  );
}

/** "dim. 26 oct.", in the phone's timezone. */
export const deadlineLabel = (closesAt: string) => {
  const day = localIsoDate(new Date(closesAt));
  return `${weekdayShort(day)}. ${formatDayMonth(day)}`;
};

type Status = 'toVote' | 'voted' | 'closed';

const pollStatus = (poll: Poll): Status => (poll.closed ? 'closed' : poll.hasVoted ? 'voted' : 'toVote');

const STATUS_STYLES: Record<Status, { bg: string; fg: string; label: string }> = {
  toVote: { bg: colors.warningTint, fg: colors.warningInk, label: 'À voter' },
  voted: { bg: colors.accentTint, fg: colors.accentInk, label: 'Tu as voté' },
  closed: { bg: colors.chip, fg: colors.inkTertiary, label: 'Clos' },
};

export function PollStatusChip({ poll }: { poll: Poll }) {
  const { bg, fg, label } = STATUS_STYLES[pollStatus(poll)];
  return <Chip label={label} bg={bg} fg={fg} />;
}

export function Chip({ label, bg = colors.chip, fg = colors.inkSecondary }: { label: string; bg?: string; fg?: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** A thin bar: the share of the trip's participants who chose the option. */
export function VoteBar({ ratio, color, height = 6 }: { ratio: number; color: string; height?: number }) {
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View style={{ width: `${Math.round(Math.min(1, ratio) * 100)}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

/** Overlapping avatars of who voted for an option; past `max`, a "+N" bubble. */
export function VoterAvatars({ voters, size = 26, max = 6 }: { voters: ContentAuthor[]; size?: number; max?: number }) {
  const shown = voters.length > max ? voters.slice(0, max - 1) : voters;
  const extra = voters.length - shown.length;
  const ringStyle = { borderRadius: size / 2 + 2 };
  return (
    <View accessible accessibilityLabel={`Votes : ${voters.map(authorName).join(', ')}`} style={styles.voters}>
      {shown.map((voter, index) => (
        <View key={voter.id} style={[styles.voterRing, ringStyle, index > 0 && { marginLeft: -size * 0.3 }]}>
          <Avatar name={voter.displayName} color={voter.avatarColor} size={size} />
        </View>
      ))}
      {extra ? (
        <View style={[styles.voterRing, ringStyle, { marginLeft: -size * 0.3 }]}>
          <View style={[styles.extra, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text style={[styles.extraText, { fontSize: size * 0.38 }]}>+{extra}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  voters: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  voterRing: { borderWidth: 2, borderColor: colors.surface },
  extra: { backgroundColor: colors.chipSoft, alignItems: 'center', justifyContent: 'center' },
  extraText: { fontFamily: fontFamily.bold, color: colors.inkSecondary },
  tile: { alignItems: 'center', justifyContent: 'center' },
  chip: { alignSelf: 'flex-start', borderRadius: radii.chip, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontFamily: fontFamily.bold, fontSize: 12 },
  track: { backgroundColor: colors.chip, overflow: 'hidden' },
});
