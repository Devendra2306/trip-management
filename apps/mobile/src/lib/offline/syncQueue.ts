import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

const QUEUE_KEY = '@yatra_offline_queue';

export interface QueuedExpense {
  id: string;
  trip_id: string;
  expense: {
    title: string;
    amount: number;
    currency: string;
    category: string;
    paid_by: string;
    split_type: string;
    created_by: string;
  };
  shares: {
    user_id: string;
    amount: number;
  }[];
  created_at: string;
  retry_count: number;
}

export const syncQueue = {
  async getQueue(): Promise<QueuedExpense[]> {
    try {
      const data = await AsyncStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async enqueueExpense(item: Omit<QueuedExpense, 'id' | 'created_at' | 'retry_count'>): Promise<QueuedExpense> {
    const queue = await this.getQueue();
    const queuedItem: QueuedExpense = {
      ...item,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      retry_count: 0,
    };

    queue.push(queuedItem);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return queuedItem;
  },

  async remove(id: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter((item) => item.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  },

  async syncAll(): Promise<{ synced: number; failed: number }> {
    const queue = await this.getQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        // 1. Insert expense
        const { data: exp, error: expErr } = await supabase
          .from('expenses')
          .insert({
            trip_id: item.trip_id,
            title: item.expense.title,
            amount: item.expense.amount,
            currency: item.expense.currency,
            category: item.expense.category,
            paid_by: item.expense.paid_by,
            split_type: item.expense.split_type,
            created_by: item.expense.created_by,
          })
          .select()
          .single();

        if (expErr) throw expErr;

        // 2. Insert shares
        const sharesToInsert = item.shares.map((s) => ({
          expense_id: exp.id,
          user_id: s.user_id,
          amount: s.amount,
        }));

        const { error: sharesErr } = await supabase.from('expense_shares').insert(sharesToInsert);
        if (sharesErr) throw sharesErr;

        // 3. Remove from queue
        await this.remove(item.id);
        synced++;
      } catch (e) {
        console.warn('Sync failed for item', item.id, e);
        failed++;
      }
    }

    return { synced, failed };
  },
};
