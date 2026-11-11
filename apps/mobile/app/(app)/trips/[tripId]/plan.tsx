import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import { offlineStorage } from '../../../../src/lib/offline/storage';
import { Input } from '../../../../src/components/ui/Input';
import { Button } from '../../../../src/components/ui/Button';
import { PALETTE, type ItineraryItem, type TripRole } from '@yatra/shared';

export default function MobilePlanTab() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [role, setRole] = useState<TripRole>('member');
  const [refreshing, setRefreshing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form
  const [dayNumber, setDayNumber] = useState('1');
  const [type, setType] = useState('activity');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [adding, setAdding] = useState(false);

  const loadData = useCallback(async () => {
    if (!tripId) return;

    // 1. Read offline cache
    const cached = await offlineStorage.getCachedItinerary(tripId);
    if (cached && cached.length > 0) {
      setItems(cached);
    }

    // 2. Fetch fresh
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: member } = await supabase
          .from('trip_members')
          .select('role')
          .eq('trip_id', tripId)
          .eq('user_id', user.id)
          .single();
        if (member) setRole(member.role as TripRole);
      }

      const { data: freshItems, error } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('day_number', { ascending: true })
        .order('order_index', { ascending: true });

      if (!error && freshItems) {
        setItems(freshItems as ItineraryItem[]);
        await offlineStorage.cacheItinerary(tripId, freshItems as ItineraryItem[]);
      }
    } catch {
      // offline: keep cache
    } finally {
      setRefreshing(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadData();

    // Supabase Realtime
    const channel = supabase
      .channel(`mobile-plan-${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itinerary_items', filter: `trip_id=eq.${tripId}` },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, loadData]);

  const handleAddItem = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter an event title.');
      return;
    }

    setAdding(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('itinerary_items').insert({
        trip_id: tripId,
        day_number: parseInt(dayNumber, 10) || 1,
        order_index: 0,
        type: type as any,
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        start_time: startTime.trim() || null,
        created_by: user.id,
      });

      if (error) throw error;

      setIsAddOpen(false);
      setTitle('');
      setDescription('');
      setLocation('');
      setStartTime('');
      loadData();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not add event');
    } finally {
      setAdding(false);
    }
  };

  const isOrganizer = role === 'organizer';

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.title}>Day-by-Day Journey Plan</Text>
          <Text style={styles.subtitle}>
            {isOrganizer ? 'Organizer editing enabled' : 'Viewing itinerary (read-only)'}
          </Text>
        </View>

        {isOrganizer && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setIsAddOpen(true)}>
            <Text style={styles.addBtnText}>+ Add Plan</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={PALETTE.saffron}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Itinerary Plans</Text>
            <Text style={styles.emptyDesc}>
              {isOrganizer
                ? 'Plan out sights, stays, and train departures for the group.'
                : 'The trip organizer has not added itinerary events yet.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.planCard}>
            <View style={styles.dayBadge}>
              <Text style={styles.dayText}>DAY {item.day_number}</Text>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.typeRow}>
                <Text style={styles.typeText}>{item.type.toUpperCase()}</Text>
                {item.start_time ? (
                  <Text style={styles.timeText}>⏰ {item.start_time}</Text>
                ) : null}
              </View>

              <Text style={styles.itemTitle}>{item.title}</Text>
              {item.description ? (
                <Text style={styles.itemDesc}>{item.description}</Text>
              ) : null}
              {item.location ? (
                <Text style={styles.locationText}>📍 {item.location}</Text>
              ) : null}
            </View>
          </View>
        )}
      />

      {/* Add Plan Modal (Organizer only) */}
      <Modal visible={isAddOpen} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Itinerary Event</Text>
          <Text style={styles.modalSubtitle}>Trip Organizer Mode</Text>

          <Input
            label="Day Number"
            placeholder="1"
            value={dayNumber}
            onChangeText={setDayNumber}
            keyboardType="numeric"
          />

          <Input
            label="Event Title"
            placeholder="e.g. Check into Hotel or Evening Boat Ride"
            value={title}
            onChangeText={setTitle}
          />

          <Input
            label="Start Time (HH:MM)"
            placeholder="e.g. 17:30"
            value={startTime}
            onChangeText={setStartTime}
          />

          <Input
            label="Location"
            placeholder="e.g. Dashashwamedh Ghat"
            value={location}
            onChangeText={setLocation}
          />

          <Input
            label="Notes / Tips"
            placeholder="Any extra details..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={{ height: 70, textAlignVertical: 'top' }}
          />

          <Button
            title="Save Itinerary Event"
            onPress={handleAddItem}
            isLoading={adding}
            style={{ marginTop: 12 }}
          />

          <Button
            title="Cancel"
            variant="outline"
            onPress={() => setIsAddOpen(false)}
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.ash,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: PALETTE.navy,
  },
  subtitle: {
    fontSize: 11,
    color: PALETTE.slate,
  },
  addBtn: {
    backgroundColor: PALETTE.saffron,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  list: {
    padding: 16,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE.ash,
    marginBottom: 10,
    flexDirection: 'row',
  },
  dayBadge: {
    backgroundColor: PALETTE.saffron,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginRight: 12,
  },
  dayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '900',
  },
  cardBody: {
    flex: 1,
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: PALETTE.slate,
  },
  timeText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: PALETTE.navy,
    fontWeight: '700',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: PALETTE.coal,
  },
  itemDesc: {
    fontSize: 12,
    color: PALETTE.slate,
    marginTop: 4,
  },
  locationText: {
    fontSize: 11,
    color: PALETTE.saffron,
    fontWeight: '600',
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 48,
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
  modalScroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalContent: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: PALETTE.navy,
  },
  modalSubtitle: {
    fontSize: 12,
    color: PALETTE.slate,
    marginBottom: 16,
  },
});
