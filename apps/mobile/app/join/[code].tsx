import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Button } from '../../src/components/ui/Button';
import { PALETTE } from '@yatra/shared';

export default function MobileJoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function join() {
      if (!code) return;
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      try {
        const { data: tripId, error: rpcErr } = await supabase.rpc('join_trip_by_code', {
          code: code.trim().toUpperCase(),
        });

        if (rpcErr) throw rpcErr;

        router.replace(`/(app)/trips/${tripId}/overview`);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Invalid invite code or unable to join');
        setLoading(false);
      }
    }

    join();
  }, [code, router]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.badge}>INDIAN RAILWAYS PASS</Text>
        <Text style={styles.title}>Joining Trip {code}</Text>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={PALETTE.saffron} />
            <Text style={styles.statusText}>Validating invite code...</Text>
          </View>
        ) : error ? (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.errorText}>{error}</Text>
            <Button
              title="Return to Journeys"
              onPress={() => router.replace('/(app)/trips')}
              style={{ marginTop: 16 }}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF8',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(201, 169, 78, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  badge: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: PALETTE.brass,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: PALETTE.navy,
    marginVertical: 12,
  },
  loader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  statusText: {
    fontSize: 12,
    color: PALETTE.slate,
    fontFamily: 'monospace',
    marginTop: 10,
  },
  errorText: {
    fontSize: 13,
    color: PALETTE.rust,
    textAlign: 'center',
  },
});
