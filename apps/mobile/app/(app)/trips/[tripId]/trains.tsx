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
import { TicketStub } from '../../../../src/components/train/TicketStub';
import { SplitFlapDisplay } from '../../../../src/components/train/SplitFlapDisplay';
import { Input } from '../../../../src/components/ui/Input';
import { Button } from '../../../../src/components/ui/Button';
import { PALETTE, type Ticket, type PnrStatusHistory } from '@yatra/shared';
import { DEFAULT_USER } from '../../../../src/lib/auth';

export default function MobileTrainsTab() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [historyMap, setHistoryMap] = useState<Record<string, PnrStatusHistory>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New ticket state
  const [pnr, setPnr] = useState('');
  const [trainNumber, setTrainNumber] = useState('');
  const [trainName, setTrainName] = useState('');
  const [fromStation, setFromStation] = useState('');
  const [fromName, setFromName] = useState('');
  const [toStation, setToStation] = useState('');
  const [toName, setToName] = useState('');
  const [boardingDate, setBoardingDate] = useState('');
  const [journeyClass, setJourneyClass] = useState('3A');
  const [adding, setAdding] = useState(false);

  const loadData = useCallback(async () => {
    if (!tripId) return;

    // 1. Immediately read cached tickets (crucial for trains with poor cellular signal!)
    const cached = await offlineStorage.getCachedTickets(tripId);
    if (cached) {
      setTickets(cached.tickets);
      setHistoryMap(cached.historyMap);
    }

    // 2. Fetch fresh tickets from Supabase if online
    try {
      const { data: ticketList, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('trip_id', tripId)
        .order('boarding_date', { ascending: true });

      if (!error && ticketList) {
        setTickets(ticketList as Ticket[]);

        // Fetch latest status
        if (ticketList.length > 0) {
          const ids = ticketList.map((t) => t.id);
          const { data: historyList } = await supabase
            .from('pnr_status_history')
            .select('*')
            .in('ticket_id', ids)
            .order('checked_at', { ascending: false });

          const newHistoryMap: Record<string, PnrStatusHistory> = {};
          if (historyList) {
            for (const item of historyList as PnrStatusHistory[]) {
              if (!newHistoryMap[item.ticket_id]) {
                newHistoryMap[item.ticket_id] = item;
              }
            }
          }
          setHistoryMap(newHistoryMap);

          // Update local offline cache!
          await offlineStorage.cacheTickets(tripId, ticketList as Ticket[], newHistoryMap);
        }
      }
    } catch {
      // Offline fallback: keep cached tickets
    } finally {
      setRefreshing(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadData();

    // Supabase Realtime
    const channel = supabase
      .channel(`mobile-trains-${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `trip_id=eq.${tripId}` },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pnr_status_history' },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, loadData]);

  const handleAddTicket = async () => {
    if (!pnr.trim() || !trainNumber.trim()) {
      Alert.alert('Required', 'Please fill in PNR and Train Number.');
      return;
    }

    setAdding(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userId = user?.id || DEFAULT_USER.id;

      // Ensure profile exists for PIN user
      await supabase.from('profiles').upsert({
        id: userId,
        email: user?.email || DEFAULT_USER.email,
        display_name: user?.user_metadata?.display_name || DEFAULT_USER.display_name,
      });

      const { error } = await supabase.from('tickets').insert({
        trip_id: tripId,
        pnr: pnr.trim(),
        train_number: trainNumber.trim(),
        train_name: trainName.trim() || 'Express Train',
        from_station: fromStation.trim().toUpperCase() || 'NDLS',
        from_station_name: fromName.trim() || 'Origin',
        to_station: toStation.trim().toUpperCase() || 'BCT',
        to_station_name: toName.trim() || 'Destination',
        boarding_date: boardingDate.trim() || new Date().toISOString().split('T')[0],
        journey_class: journeyClass,
        added_by: userId,
      });

      if (error) throw error;

      setIsAddOpen(false);
      setPnr('');
      setTrainNumber('');
      setTrainName('');
      loadData();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not add ticket');
    } finally {
      setAdding(false);
    }
  };

  // Station Split Flap text
  const first = tickets[0];
  const firstStatus = first ? historyMap[first.id]?.status_data?.passengers?.[0]?.current_status : null;
  const flapText = first ? `${first.train_number} ${firstStatus || 'CNF'}` : 'NO TRAIN';

  return (
    <View style={styles.container}>
      {/* Top Station Flap Board */}
      <View style={styles.stationBoard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.boardLabel}>LIVE SPLIT-FLAP STATION BOARD</Text>
          <Text style={styles.boardSub}>Offline cached for low-signal train routes</Text>
        </View>
        <SplitFlapDisplay text={flapText} padLength={10} label="NEXT TRAIN" />
      </View>

      <FlatList
        data={tickets}
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
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Linked Train Stubs ({tickets.length})</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setIsAddOpen(true)}>
              <Text style={styles.addBtnText}>+ Add Ticket</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Train Tickets Added</Text>
            <Text style={styles.emptyDesc}>
              Add an IRCTC PNR to automatically track coach and berth status across your group.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TicketStub ticket={item} latestStatus={historyMap[item.id]} />
        )}
      />

      {/* Add Ticket Modal */}
      <Modal visible={isAddOpen} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Train Ticket</Text>
          <Text style={styles.modalSubtitle}>Enter ticket and route details</Text>

          <Input
            label="10-Digit PNR"
            placeholder="e.g. 2458910293"
            value={pnr}
            onChangeText={setPnr}
            keyboardType="numeric"
            maxLength={10}
          />

          <Input
            label="Train Number"
            placeholder="e.g. 12951"
            value={trainNumber}
            onChangeText={setTrainNumber}
          />

          <Input
            label="Train Name"
            placeholder="e.g. Rajdhani Express"
            value={trainName}
            onChangeText={setTrainName}
          />

          <Input
            label="From Station Code"
            placeholder="e.g. NDLS"
            value={fromStation}
            onChangeText={setFromStation}
            autoCapitalize="characters"
          />

          <Input
            label="To Station Code"
            placeholder="e.g. BCT"
            value={toStation}
            onChangeText={setToStation}
            autoCapitalize="characters"
          />

          <Input
            label="Boarding Date (YYYY-MM-DD)"
            placeholder="e.g. 2026-12-25"
            value={boardingDate}
            onChangeText={setBoardingDate}
          />

          <Input
            label="Class (e.g. 3A, 2A, SL)"
            placeholder="3A"
            value={journeyClass}
            onChangeText={setJourneyClass}
            autoCapitalize="characters"
          />

          <Button
            title="Save Train Ticket"
            onPress={handleAddTicket}
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
  stationBoard: {
    backgroundColor: PALETTE.navy,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(201, 169, 78, 0.4)',
  },
  boardLabel: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: PALETTE.brass,
    letterSpacing: 1,
  },
  boardSub: {
    fontSize: 11,
    color: '#A0AEC0',
    marginTop: 2,
  },
  list: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: PALETTE.navy,
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
