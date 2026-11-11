import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import { PALETTE, type Trip, type TripMember } from '@yatra/shared';

export default function MobileOverviewTab() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);

  const loadData = useCallback(async () => {
    if (!tripId) return;

    const [tripRes, membersRes] = await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).single(),
      supabase.from('trip_members').select('*, profile:profiles(*)').eq('trip_id', tripId),
    ]);

    if (tripRes.data) setTrip(tripRes.data as Trip);
    if (membersRes.data) setMembers(membersRes.data as TripMember[]);
  }, [tripId]);

  useEffect(() => {
    loadData();

    // Supabase Realtime
    const channel = supabase
      .channel(`mobile-trip-${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_members', filter: `trip_id=eq.${tripId}` },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, loadData]);

  const handleShare = async () => {
    if (!trip) return;
    try {
      await Share.share({
        message: `Join our train trip "${trip.name}" on Yatra! Use invite code: ${trip.invite_code} or open: yatra://join/${trip.invite_code}`,
      });
    } catch (e) {
      console.warn('Share error', e);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Trip Header Card */}
      <View style={styles.headerCard}>
        <Text style={styles.codeLabel}>INVITE CODE</Text>
        <Text style={styles.inviteCode}>{trip?.invite_code || '------'}</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareText}>Share Invite Code</Text>
        </TouchableOpacity>

        <Text style={styles.tripName}>{trip?.name}</Text>
        {trip?.description ? <Text style={styles.tripDesc}>{trip.description}</Text> : null}
        <Text style={styles.tripDates}>
          {trip?.start_date || 'Date TBD'} {trip?.end_date ? `➔ ${trip.end_date}` : ''}
        </Text>
      </View>

      {/* Travelers List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Travelers ({members.length})</Text>
        {members.map((m) => {
          const name = m.profile?.display_name || m.profile?.email || 'Traveler';
          const isOrganizer = m.role === 'organizer';

          return (
            <View key={m.id} style={styles.memberRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.memberName}>{name}</Text>
                <Text style={styles.memberEmail}>{m.profile?.email}</Text>
              </View>
              <View style={[styles.roleBadge, isOrganizer && styles.organizerBadge]}>
                <Text style={[styles.roleText, isOrganizer && styles.organizerText]}>
                  {m.role}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  content: {
    padding: 16,
  },
  headerCard: {
    backgroundColor: '#FFFDF8',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 169, 78, 0.4)',
    alignItems: 'center',
    marginBottom: 20,
  },
  codeLabel: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: PALETTE.slate,
    letterSpacing: 1.5,
  },
  inviteCode: {
    fontSize: 28,
    fontFamily: 'monospace',
    fontWeight: '900',
    color: PALETTE.navy,
    letterSpacing: 4,
    marginVertical: 4,
  },
  shareBtn: {
    backgroundColor: PALETTE.saffron,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 8,
  },
  shareText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  tripName: {
    fontSize: 20,
    fontWeight: '900',
    color: PALETTE.coal,
    textAlign: 'center',
    marginTop: 8,
  },
  tripDesc: {
    fontSize: 13,
    color: PALETTE.slate,
    textAlign: 'center',
    marginTop: 4,
  },
  tripDates: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: PALETTE.slate,
    marginTop: 8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE.ash,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: PALETTE.navy,
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.mist,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PALETTE.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.coal,
  },
  memberEmail: {
    fontSize: 11,
    color: PALETTE.slate,
  },
  roleBadge: {
    backgroundColor: PALETTE.ash,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  organizerBadge: {
    backgroundColor: PALETTE.navy,
  },
  roleText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: PALETTE.slate,
    textTransform: 'uppercase',
  },
  organizerText: {
    color: '#FFFFFF',
  },
});
