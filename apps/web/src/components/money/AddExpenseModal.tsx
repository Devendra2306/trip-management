'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  calculateEqualSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  validateShares,
  type SplitType,
  type ExpenseCategory,
  type TripMember,
} from '@yatra/shared';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_USER } from '@/lib/auth';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  members: TripMember[];
  currentUserId: string;
  onExpenseAdded: () => void;
}

export function AddExpenseModal({
  isOpen,
  onClose,
  tripId,
  members,
  currentUserId,
  onExpenseAdded,
}: AddExpenseModalProps) {
  const effectiveCurrentUserId = currentUserId || DEFAULT_USER.id;
  const [title, setTitle] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [paidBy, setPaidBy] = useState(effectiveCurrentUserId);
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    members.length > 0 ? members.map((m) => m.user_id) : [effectiveCurrentUserId]
  );
  const [customValues, setCustomValues] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPaise = Math.round((parseFloat(amountRupees) || 0) * 100);

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      if (selectedUserIds.length > 1) {
        setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
      }
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const computeShares = () => {
    if (totalPaise <= 0 || selectedUserIds.length === 0) return [];

    if (splitType === 'equal') {
      return calculateEqualSplit(totalPaise, selectedUserIds);
    }

    if (splitType === 'exact') {
      return selectedUserIds.map((uid) => ({
        user_id: uid,
        amount: Math.round((customValues[uid] || 0) * 100),
      }));
    }

    if (splitType === 'percentage') {
      return calculatePercentageSplit(
        totalPaise,
        selectedUserIds.map((uid) => ({
          user_id: uid,
          percentage: customValues[uid] || 0,
        }))
      );
    }

    if (splitType === 'shares') {
      return calculateSharesSplit(
        totalPaise,
        selectedUserIds.map((uid) => ({
          user_id: uid,
          shareCount: customValues[uid] || 1,
        }))
      );
    }

    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (totalPaise <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    const calculatedShares = computeShares();
    const validation = validateShares(totalPaise, calculatedShares);

    if (!validation.valid && splitType === 'exact') {
      setError(`Shares must sum exactly to ₹${(totalPaise / 100).toFixed(2)}. Difference: ₹${(validation.difference / 100).toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userId = user?.id || effectiveCurrentUserId;
      const actualPaidBy = paidBy || userId;

      // 1. Insert expense
      const { data: expense, error: expError } = await supabase
        .from('expenses')
        .insert({
          trip_id: tripId,
          title: title.trim(),
          amount: totalPaise,
          currency: 'INR',
          category,
          paid_by: actualPaidBy,
          split_type: splitType,
          created_by: userId,
        })
        .select()
        .single();

      if (expError) throw expError;

      // 2. Insert expense shares
      const sharesToInsert = calculatedShares.map((s) => ({
        expense_id: expense.id,
        user_id: s.user_id,
        amount: s.amount,
      }));

      const { error: sharesError } = await supabase.from('expense_shares').insert(sharesToInsert);
      if (sharesError) throw sharesError;

      // 3. Trigger push notification function (fire and forget)
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-expense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ expense_id: expense.id, trip_id: tripId }),
      }).catch((e) => console.warn('Push notify trigger failed', e));

      onExpenseAdded();
      onClose();
      setTitle('');
      setAmountRupees('');
      setCustomValues({});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Trip Expense">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-rust text-xs rounded-md">
            {error}
          </div>
        )}

        <Input
          label="What was this expense for?"
          placeholder="e.g. Dinner at Banaras Cafe"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            step="0.01"
            min="0.01"
            label="Total Amount (₹)"
            placeholder="0.00"
            value={amountRupees}
            onChange={(e) => setAmountRupees(e.target.value)}
            required
          />
          <div>
            <label className="block text-xs font-semibold text-slate uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full h-10 px-3 border border-ash rounded-md bg-white text-sm text-coal focus:outline-none focus:ring-2 focus:ring-saffron"
            >
              <option value="food">Food & Drinks</option>
              <option value="transport">Transport</option>
              <option value="stay">Stay & Hotels</option>
              <option value="tickets">Tickets</option>
              <option value="shopping">Shopping</option>
              <option value="activities">Activities</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate uppercase tracking-wider mb-1">
              Paid By
            </label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full h-10 px-3 border border-ash rounded-md bg-white text-sm text-coal focus:outline-none focus:ring-2 focus:ring-saffron"
            >
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile?.display_name || m.profile?.email || 'User'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate uppercase tracking-wider mb-1">
              Split Strategy
            </label>
            <select
              value={splitType}
              onChange={(e) => setSplitType(e.target.value as SplitType)}
              className="w-full h-10 px-3 border border-ash rounded-md bg-white text-sm text-coal focus:outline-none focus:ring-2 focus:ring-saffron"
            >
              <option value="equal">Split Equally</option>
              <option value="exact">Exact Amounts (₹)</option>
              <option value="percentage">By Percentage (%)</option>
              <option value="shares">By Shares (1x, 2x...)</option>
            </select>
          </div>
        </div>

        {/* Member selector & custom split weights */}
        <div className="space-y-2 pt-2 border-t border-ash">
          <label className="block text-xs font-semibold text-slate uppercase tracking-wider">
            Split Between Members
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto p-1">
            {members.map((m) => {
              const isSelected = selectedUserIds.includes(m.user_id);
              const name = m.profile?.display_name || m.profile?.email || 'User';

              return (
                <div
                  key={m.user_id}
                  className="flex items-center justify-between p-2 rounded-lg bg-chalk border border-ash"
                >
                  <label className="flex items-center space-x-2 cursor-pointer text-sm font-medium text-coal">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleUser(m.user_id)}
                      className="rounded text-saffron focus:ring-saffron"
                    />
                    <span>{name}</span>
                  </label>

                  {isSelected && splitType !== 'equal' && (
                    <div className="w-24">
                      <input
                        type="number"
                        placeholder={
                          splitType === 'exact'
                            ? '₹'
                            : splitType === 'percentage'
                            ? '%'
                            : 'shares'
                        }
                        value={customValues[m.user_id] ?? ''}
                        onChange={(e) =>
                          setCustomValues({
                            ...customValues,
                            [m.user_id]: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full h-8 px-2 text-right text-xs font-mono border border-ash rounded bg-white"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-ash">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Save Expense
          </Button>
        </div>
      </form>
    </Modal>
  );
}
