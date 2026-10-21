import { colors } from '@7trip/ui-tokens';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { apiRequest } from '@/lib/api';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * seventrip://reprendre?voyage=<id>&jeton=<token>, from "Continuer dans l'app" on the guest web:
 * the web guest session moves to this device (and to the account, once signed in).
 */
export default function ResumeGuestSessionScreen() {
  const { voyage, jeton } = useLocalSearchParams<{ voyage?: string; jeton?: string }>();
  const { addGuestSession, guestSessions } = useAuth();
  // Once: storing the session changes the auth context, which would run this again.
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    if (!voyage || !UUID.test(voyage) || !jeton) {
      router.replace('/');
      return;
    }
    void (async () => {
      // Only a token that still opens this trip replaces what the device has: an old link must not
      // overwrite a session that works.
      const valid = await apiRequest(`/trips/${voyage}`, { guestToken: jeton }).then(
        () => true,
        () => false,
      );
      if (valid) await addGuestSession(voyage, jeton);
      if (valid || voyage in guestSessions) {
        router.replace(`/voyage/${voyage}` as Href);
        return;
      }
      Alert.alert('Lien expiré', 'Cette session invitée n’est plus valable. Rouvre le lien d’invitation pour rejoindre le voyage.');
      router.replace('/');
    })();
  }, [voyage, jeton, addGuestSession, guestSessions]);

  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
