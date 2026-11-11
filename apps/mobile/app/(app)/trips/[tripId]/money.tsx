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
import { syncQueue } from '../../../../src/lib/offline/syncQueue';
import { networkStatus } from '../../../../src/lib/offline/networkStatus';
import { SettleUpButton } from '../../../../src/components/money/SettleUpButton';
import { Input } from '../../../../src/components/ui/Input';
import { Button } from '../../../../src/components/ui/Button';
import {
  simplifyDebts,
  calculateEqualSplit,
  PALETTE,
  type Expense,
  type Settlement,
  type TripMember,
  type SimplifiedDebt,
} from '@yatra/shared';

export default function MobileMoneyTab() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [simplifiedDebts, setSimplifiedDebts] = useState<SimplifiedDebt[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [subTab, setSubTab] = useState<'expenses' | 'debts'>('expenses');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [offlinePendingCount, setOfflinePendingCount] = useState(0);

  // Form state
  const [title, setTitle] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [category, setCategory] = useState('food');
  const [adding, setAdding] = useState(false);

  const loadData = useCallback(async () => {
    if (!tripId) return;

    // Check offline pending queue count
    const queue = await syncQueue.getQueue();
    setOfflinePendingCount(queue.filter((q) => q.trip_id === tripId).length);

    // 1. Immediately read cached finances (crucial for trains with poor signal)
    const cached = await offlineStorage.getCachedFinances(tripId);
    if (cached) {
      setExpenses(cached.expenses);
      setSimplifiedDebts(cached.simplifiedDebts);
    }

    // 2. Fresh fetch if online
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const [memberRes, expRes, setRes] = await Promise.all([
        supabase.from('trip_members').select('*, profile:profiles(*)').eq('trip_id', tripId),
        supabase
          .from('expenses')
          .select('*, shares:expense_shares(*)')
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false }),
        supabase.from('settlements').select('*').eq('trip_id', tripId),
      ]);

      if (memberRes.data) setMembers(memberRes.data as TripMember[]);
      if (expRes.data) setExpenses(expRes.data);
      if (setRes.data) setSettlements(setRes.data as Settlement[]);

      if (expRes.data) {
        const debts = simplifyDebts(expRes.data as any, (setRes.data as Settlement[]) || []);
        setSimplifiedDebts(debts);

        // Cache locally for offline use
        await offlineStorage.cacheFinances(tripId, expRes.data, [], debts);
      }
    } catch {
      // offline: maintain local cache
    } finally {
      setRefreshing(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadData();

    // Supabase Realtime
    const channel = supabase
      .channel(`mobile-money-${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlements', filter: `trip_id=eq.${tripId}` },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, loadData]);

  const handleAddExpense = async () => {
    const rupees = parseFloat(amountRupees);
    if (!title.trim() || isNaN(rupees) || rupees <= 0) {
      Alert.alert('Required', 'Please enter a valid title and amount.');
      return;
    }

    setAdding(true);
    const amountPaise = Math.round(rupees * 100);
    const userIds = members.map((m) => m.user_id);
    const shares = calculateEqualSplit(amountPaise, userIds);

    const isOnline = networkStatus.isOnline();

    if (!isOnline) {
      // OFFLINE QUEUE SUPPORT (Crucial for train journeys with poor signal)
      await syncQueue.enqueueExpense({
        trip_id: tripId,
        expense: {
          title: title.trim(),
          amount: amountPaise,
          currency: 'INR',
          category,
          paid_by: currentUserId,
          split_type: 'equal',
          created_by: currentUserId,
        },
        shares,
      });

      // Optimistically insert into local view
      const optimisticExp = {
        id: `local_${Date.now()}`,
        trip_id: tripId,
        title: title.trim(),
        amount: amountPaise,
        currency: 'INR',
        category,
        paid_by: currentUserId,
        split_type: 'equal',
        created_at: new Date().toISOString(),
        shares,
        is_pending: true,
      };

      setExpenses([optimisticExp, ...expenses]);
      setOfflinePendingCount((prev) => prev + 1);

      setIsAddOpen(false);
      setTitle('');
      setAmountRupees('');
      setAdding(false);

      Alert.alert(
        'Saved Offline 🚂',
        'You have no signal on the train right now. This expense was queued locally and will automatically sync when network is restored.'
      );
      return;
    }

    // ONLINE INSERT
    try {
      const { data: exp, error: expErr } = await supabase
        .from('expenses')
        .insert({
          trip_id: tripId,
          title: title.trim(),
          amount: amountPaise,
          currency: 'INR',
          category,
          paid_by: currentUserId,
          split_type: 'equal',
          created_by: currentUserId,
        })
        .select()
        .single();

      if (expErr) throw expErr;

      const sharesToInsert = shares.map((s) => ({
        expense_id: exp.id,
        user_id: s.user_id,
        amount: s.amount,
      }));

      await supabase.from('expense_shares').insert(sharesToInsert);

      setIsAddOpen(false);
      setTitle('');
      setAmountRupees('');
      loadData();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not add expense');
    } finally {
      setAdding(false);
    }
  };

  const getMemberName = (userId: string) => {
    const m = members.find((mem) => mem.user_id === userId);
    return m?.profile?.display_name || m?.profile?.email?.split('@')[0] || 'Member';
  };

  const getMemberVpa = (userId: string) => {
    const m = members.find((mem) => mem.user_id === userId);
    return m?.profile?.upi_vpa || 'traveler@upi';
  };

  const totalSpent = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  return (
    <View style={styles.container}>
      {/* Offline Pending Queue Banner */}
      {offlinePendingCount > 0 && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            📶 {offlinePendingCount} expense{offlinePendingCount > 1 ? 's' : ''} queued offline (will auto-sync)
          </Text>
        </View>
      )}

      {/* Spend Card */}
      <View style={styles.kpiCard}>
        <View>
          <Text style={styles.kpiLabel}>TOTAL TRIP SPEND</Text>
          <Text style={styles.kpiValue}>₹{(totalSpent / 100).toFixed(0)}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setIsAddOpen(true)}>
          <Text style={styles.addBtnText}>+ Add Expense</Text>
        </TouchableOpacity>
      </View>

      {/* Sub Tabs */}
      <View style={styles.subTabs}>
        <TouchableOpacity
          style={[styles.subTab, subTab === 'expenses' && styles.activeSubTab]}
          onPress={() => setSubTab('expenses')}
        >
          <Text style={[styles.subTabText, subTab === 'expenses' && styles.activeSubTabText]}>
            Expenses ({expenses.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTab, subTab === 'debts' && styles.activeSubTab]}
          onPress={() => setSubTab('debts')}
        >
          <Text style={[styles.subTabText, subTab === 'debts' && styles.activeSubTabText]}>
            Settle Up ({simplifiedDebts.length})
          </Text>
        </TouchableOpacity>
      </View>

      {subTab === 'expenses' ? (
        <FlatList
          data={expenses}
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
              <Text style={styles.emptyTitle}>No Expenses Recorded</Text>
              <Text style={styles.emptyDesc}>Keep track of food, chai, taxi, or hotels.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.expenseCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.expTitle}>{item.title}</Text>
                <Text style={styles.expMeta}>
                  Paid by {getMemberName(item.paid_by)} • {item.category}
                </Text>
                {item.is_pending && (
                  <Text style={styles.pendingTag}>⏳ QUEUED OFFLINE</Text>
                )}
              </View>
              <Text style={styles.expAmount}>₹{(item.amount / 100).toFixed(0)}</Text>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={simplifiedDebts}
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>All Settled Up! 🎉</Text>
              <Text style={styles.emptyDesc}>No pending transfers between travelers.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isPayer = item.from === currentUserId;
            return (
              <View style={styles.debtCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.debtFlow}>
                    {getMemberName(item.from)} ➔ {getMemberName(item.to)}
                  </Text>
                  <Text style={styles.debtAmount}>₹{(item.amount / 100).toFixed(2)}</Text>
                </View>

                {isPayer && (
                  <SettleUpButton
                    debt={item}
                    payeeName={getMemberName(item.to)}
                    payeeVpa={getMemberVpa(item.to)}
                    tripId={tripId}
                    onSettled={loadData}
                  />
                )}
              </View>
            );
          }}
        />
      )}

      {/* Add Expense Modal */}
      <Modal visible={isAddOpen} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Trip Expense</Text>
          <Text style={styles.modalSubtitle}>
            Works offline on train rides with no signal
          </Text>

          <Input
            label="What was this expense for?"
            placeholder="e.g. Chai & Samosa at Kanpur station"
            value={title}
            onChangeText={setTitle}
          />

          <Input
            label="Amount (₹)"
            placeholder="e.g. 150"
            value={amountRupees}
            onChangeText={setAmountRupees}
            keyboardType="numeric"
          />

          <Input
            label="Category (food, transport, stay, tickets)"
            placeholder="food"
            value={category}
            onChangeText={setCategory}
          />

          <Button
            title="Save Expense (Split Equally)"
            onPress={handleAddExpense}
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
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offlineText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '700',
    textAlign: 'center',
  },
  kpiCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.ash,
  },
  kpiLabel: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: PALETTE.slate,
  },
  kpiValue: {
    fontSize: 24,
    fontFamily: 'monospace',
    fontWeight: '900',
    color: PALETTE.navy,
  },
  addBtn: {
    backgroundColor: PALETTE.saffron,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  subTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.ash,
  },
  subTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeSubTab: {
    borderBottomColor: PALETTE.saffron,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.slate,
  },
  activeSubTabText: {
    color: PALETTE.saffron,
  },
  list: {
    padding: 16,
  },
  expenseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: PALETTE.ash,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: PALETTE.coal,
  },
  expMeta: {
    fontSize: 11,
    color: PALETTE.slate,
    marginTop: 2,
  },
  pendingTag: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: PALETTE.saffron,
    marginTop: 4,
  },
  expAmount: {
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: '900',
    color: PALETTE.navy,
  },
  debtCard: {
    backgroundColor: '#FFFDF8',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 169, 78, 0.4)',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debtFlow: {
    fontSize: 13,
    fontWeight: '800',
    color: PALETTE.coal,
  },
  debtAmount: {
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: '900',
    color: PALETTE.navy,
    marginTop: 2,
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
