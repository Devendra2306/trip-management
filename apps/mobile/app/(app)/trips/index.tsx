import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { offlineStorage } from '../../../src/lib/offline/storage';
import { DEFAULT_USER, clearPinAuthenticated } from '../../../src/lib/auth';
import { PALETTE, type Trip } from '@yatra/shared';

export default function TripsListScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadTrips = useCallback(async () => {
    // 1. Immediately load cached trips for zero-delay offline experience
    const cached = await offlineStorage.getCachedTrips();
    if (cached && cached.length > 0) {
      setTrips(cached);
    }

    // 2. Fetch fresh from Supabase
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userId = user?.id || DEFAULT_USER.id;

      // First try fetching trips where user is a member
      let freshTrips: Trip[] = [];
      const { data: memberRecords, error } = await supabase
        .from('trip_members')
        .select('trip_id, trips(*)')
        .eq('user_id', userId);

      if (!error && memberRecords && memberRecords.length > 0) {
        freshTrips = memberRecords
          .filter((m) => m.trips)
          .map((m) => m.trips as unknown as Trip);
      } else {
        // Fallback for PIN mode: fetch all trips directly
        const { data: allTrips, error: tripsErr } = await supabase
          .from('trips')
          .select('*')
          .order('created_at', { ascending: false });

        if (!tripsErr && allTrips) {
          freshTrips = allTrips as unknown as Trip[];
        }
      }

      if (freshTrips.length > 0) {
        setTrips(freshTrips);
        await offlineStorage.cacheTrips(freshTrips);
      }
    } catch {
      // Offline: keep cached data
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTrips();
  };

  const handleSignOut = () => {
    Alert.alert('Lock Jal Khoj', 'Do you want to log out and lock the app?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Lock App',
        style: 'destructive',
        onPress: async () => {
          await clearPinAuthenticated();
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Top Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.newTripBtn}
          onPress={() => router.push('/(app)/trips/new')}
        >
          <Text style={styles.newTripText}>+ Create Trip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.joinBtn}
          onPress={() => {
            Alert.prompt(
              'Join Trip',
              'Enter the 6-character trip invite code:',
              async (code) => {
                if (!code) return;
                const clean = code.trim().toUpperCase();
                try {
                  const { data: tripId, error } = await supabase.rpc('join_trip_by_code', {
                    code: clean,
                  });
                  if (!error && tripId) {
                    router.push(`/(app)/trips/${tripId}/overview`);
                    return;
                  }

                  // Direct lookup fallback for PIN mode
                  const { data: trip, error: tErr } = await supabase
                    .from('trips')
                    .select('id')
                    .eq('invite_code', clean)
                    .single();

                  if (tErr || !trip) {
                    throw new Error('Invalid invite code');
                  }

                  router.push(`/(app)/trips/${trip.id}/overview`);
                } catch (e: unknown) {
                  Alert.alert('Join Error', e instanceof Error ? e.message : 'Invalid invite code');
                }
              }
            );
          }}
        >
          <Text style={styles.joinText}>Join with Code</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.lockBtn} onPress={handleSignOut}>
          <Text style={styles.lockText}>🔒</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PALETTE.saffron} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Journeys Found</Text>
            <Text style={styles.emptyDesc}>
              Create a new trip or join using a 6-character code from a friend.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tripCard}
            activeOpacity={0.8}
            onPress={() => router.push(`/(app)/trips/${item.id}/overview`)}
          >
            <View style={styles.cardStripe} />
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.codeTag}>CODE: {item.invite_code}</Text>
                <Text style={styles.dateText}>{item.start_date || 'Upcoming'}</Text>
              </View>
              <Text style={styles.tripName}>{item.name}</Text>
              {item.description ? (
                <Text style={styles.tripDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.ash,
    alignItems: 'center',
  },
  newTripBtn: {
    flex: 1,
    backgroundColor: PALETTE.saffron,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  newTripText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  joinBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: PALETTE.navy,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinText: {
    color: PALETTE.navy,
    fontWeight: '800',
    fontSize: 13,
  },
  lockBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: PALETTE.ash,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockText: {
    fontSize: 14,
  },
  list: {
    padding: 16,
  },
  tripCard: {
    backgroundColor: '#FFFDF8',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 169, 78, 0.4)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardStripe: {
    height: 3,
    backgroundColor: PALETTE.saffron,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  codeTag: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: PALETTE.brass,
  },
  dateText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: PALETTE.slate,
  },
  tripName: {
    fontSize: 18,
    fontWeight: '800',
    color: PALETTE.navy,
  },
  tripDesc: {
    fontSize: 12,
    color: PALETTE.slate,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 64,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: PALETTE.navy,
  },
  emptyDesc: {
    fontSize: 12,
    color: PALETTE.slate,
    textAlign: 'center',
    maxWidth: 240,
    marginTop: 6,
  },
});
