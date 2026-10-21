import { colors } from '@7trip/ui-tokens';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-context';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * seventrip://reprendre?voyage=<id>&jeton=<token>, from "Continuer dans l'app" on the guest web:
 * the web guest session moves to this device (and to the account, once signed in).
 */
export default function ResumeGuestSessionScreen() {
  const { voyage, jeton } = useLocalSearchParams<{ voyage?: string; jeton?: string }>();
  const { addGuestSession } = useAuth();
  // Once: storing the session changes the auth context, which would run this again.
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    if (!voyage || !UUID.test(voyage) || !jeton) {
      router.replace('/');
      return;
    }
    void addGuestSession(voyage, jeton).then(() => router.replace(`/voyage/${voyage}` as Href));
  }, [voyage, jeton, addGuestSession]);

  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
