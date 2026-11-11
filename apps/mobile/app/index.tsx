import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { PALETTE } from '@yatra/shared';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/(app)/trips');
      } else {
        router.replace('/(auth)/login');
      }
    });
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
