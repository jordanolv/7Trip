import { type Poll } from '@7trip/shared';
import { colors, fontFamily, spacing } from '@7trip/ui-tokens';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { haptics } from '@/lib/haptics';
import { pollUrl } from '@/lib/poll-link';
import { deadlineLabel } from '@/polls/poll-visuals';
import { usePoll } from '@/polls/polls-api';
import { can } from '@/trips/permissions';
import { useInvitation, useTrip } from '@/trips/trips-api';
import { useTripId } from '@/trips/use-trip-id';

/** "Où part-on cet été ? Split, Naxos ou Cefalù : vote avant dim. 26 oct. sur 7Trip : <lien>". */
function shareMessage(poll: Poll, url: string): string {
  const labels = poll.options.map((o) => o.label);
  const choices = labels.length <= 4 ? `${labels.slice(0, -1).join(', ')} ou ${labels.at(-1)}` : null;
  const deadline = poll.closesAt ? ` avant ${deadlineLabel(poll.closesAt)}` : '';
  return `${poll.question}${choices ? ` ${choices} :` : ''} vote${deadline} sur 7Trip : ${url}`;
}

/** Native share with a prefilled message (CDC §6). The link carries the invitation when the sharer may invite. */
export default function PartagerSondageScreen() {
  const tripId = useTripId();
  const { pollId } = useLocalSearchParams<{ pollId: string }>();
  const poll = usePoll(tripId, pollId);
  const trip = useTrip(tripId);
  const canInvite = trip.data ? can('invite', trip.data) : false;
  const invitation = useInvitation(tripId, canInvite);
  const [copied, setCopied] = useState(false);

  // Waits for the invitation code when there will be one, so the link shared is the final one.
  const ready = poll.data && trip.data && (!canInvite || invitation.data || invitation.isError);
  const url = ready ? pollUrl(pollId, invitation.data?.code) : null;
  const message = poll.data && url ? shareMessage(poll.data, url) : null;

  const copy = async () => {
    if (!url) return;
    await Clipboard.setStringAsync(url);
    haptics.success();
    setCopied(true);
  };

  return (
    <Sheet title="Partager le sondage">
      <AppText tone="secondary">Envoie-le dans ton groupe WhatsApp, Messages, Telegram…</AppText>

      {message ? (
        <>
          <View style={styles.previewBlock}>
            <Text style={styles.previewLabel}>Aperçu du message</Text>
            <View style={styles.bubble}>
              <Text style={styles.bubbleText}>{message}</Text>
            </View>
          </View>

          <View style={styles.linkBox}>
            <Text selectable numberOfLines={1} style={styles.linkText}>
              {url}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void copy()} style={styles.copy}>
              <Icon name={copied ? 'check' : 'copy'} color={colors.ink} size={16} />
              <Text style={styles.copyText}>{copied ? 'Copié' : 'Copier'}</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      )}

      <View style={styles.note}>
        <Icon name="lock" color={colors.inkSecondary} size={18} />
        <AppText variant="caption" tone="secondary" style={styles.flex}>
          {canInvite
            ? 'Le lien ouvre l’app, ou la page web si elle n’est pas installée. Tes amis votent sans compte : ceux qui ne sont pas encore dans le voyage le rejoignent d’abord.'
            : 'Le lien ouvre l’app, ou la page web si elle n’est pas installée. Seuls les membres du voyage peuvent voter.'}
        </AppText>
      </View>

      <Button
        title="Partager…"
        disabled={!message}
        icon={<Icon name="share" color={colors.surface} size={20} />}
        onPress={() => message && void Share.share({ message })}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginVertical: spacing.lg },
  previewBlock: { gap: 6 },
  previewLabel: { fontFamily: fontFamily.bold, fontSize: 12, letterSpacing: 0.7, textTransform: 'uppercase', color: colors.inkSecondary },
  bubble: { alignSelf: 'flex-end', maxWidth: '90%', backgroundColor: '#DCF3D6', borderRadius: 18, borderBottomRightRadius: 4, padding: spacing.md },
  bubbleText: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, color: colors.ink },
  linkBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 14, padding: 6, paddingLeft: 14 },
  linkText: { flex: 1, fontFamily: fontFamily.semibold, fontSize: 14, color: colors.inkTertiary },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.chipSoft },
  copyText: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.ink },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
});
