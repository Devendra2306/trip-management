import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { isPinAuthenticated } from '../src/lib/auth';
import { PALETTE } from '@yatra/shared';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const pinAuth = await isPinAuthenticated();
      if (pinAuth) {
        router.replace('/(app)/trips');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/(app)/trips');
      } else {
        router.replace('/(auth)/login');
      }
    }

    checkAuth();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={PALETTE.saffron} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
